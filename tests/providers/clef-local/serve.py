"""Local REST-shaped adapter for the official Cloudflare Clef-Flash model.

This is a loopback-only compatibility harness for this repository's Cloudflare
provider. It is not the Cloudflare Workers AI API implementation.
"""

from __future__ import annotations

import argparse
import asyncio
import importlib
import os
import re
import subprocess
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Literal

import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from transformers import BitsAndBytesConfig


MODEL_ID = "Cloudflare/clef-flash"
MODEL_NAME = "clef-flash"
MODEL_PATH = "@cf/cloudflare/clef-flash"
REVISION = "17f0b0ad64efb65d273590632833508766b2aae6"
MAX_LENGTH = 4096
DEFAULT_PORT = 8765


class DecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    model: Literal[MODEL_NAME]
    state: Any
    questions: dict[str, Any] = Field(min_length=1)


class ClefRuntime:
    def __init__(self, device: str) -> None:
        self.device = device
        self.model: Any = None
        self.processor: Any = None
        self.systemone: Any = None
        self.revision = REVISION
        self.inference_lock = asyncio.Lock()


def runtime_metadata(runtime: ClefRuntime) -> dict[str, Any]:
    if runtime.model is None:
        return {
            "quantization": {
                "loaded_in_4bit": False,
                "bits": None,
                "scheme": None,
                "double_quant": None,
                "compute_dtype": None,
                "quantized_linear_layers": 0,
            },
            "backbone_first_parameter_device": None,
            "head": {"dtype": None, "device": None},
        }

    import bitsandbytes as bnb

    language_model = runtime.model.language_model
    quantized_layers = [
        module
        for module in language_model.modules()
        if isinstance(module, bnb.nn.Linear4bit)
    ]
    first_layer = quantized_layers[0] if quantized_layers else None
    quant_state = (
        getattr(first_layer.weight, "quant_state", None)
        if first_layer is not None
        else None
    )
    first_backbone_parameter = next(language_model.parameters(), None)
    first_head_parameter = next(runtime.model.head.parameters(), None)
    loaded_in_4bit = bool(getattr(language_model, "is_loaded_in_4bit", False)) and bool(
        quantized_layers
    )

    return {
        "quantization": {
            "loaded_in_4bit": loaded_in_4bit,
            "bits": 4 if loaded_in_4bit else None,
            "scheme": getattr(quant_state, "quant_type", None),
            "double_quant": bool(getattr(quant_state, "nested", False)),
            "compute_dtype": (
                str(first_layer.compute_dtype).removeprefix("torch.")
                if first_layer is not None
                else None
            ),
            "quantized_linear_layers": len(quantized_layers),
        },
        "backbone_first_parameter_device": (
            str(first_backbone_parameter.device)
            if first_backbone_parameter is not None
            else None
        ),
        "head": {
            "dtype": (
                str(first_head_parameter.dtype).removeprefix("torch.")
                if first_head_parameter is not None
                else None
            ),
            "device": (
                str(first_head_parameter.device)
                if first_head_parameter is not None
                else None
            ),
        },
    }


def canonical_device(device: str) -> str:
    return "cuda:0" if device == "cuda" else device


def verify_model_checkout(model_path: Path) -> Path:
    try:
        resolved_path = model_path.expanduser().resolve(strict=True)
    except (OSError, RuntimeError):
        raise ValueError("The local model path is unavailable.") from None
    if not resolved_path.is_dir():
        raise ValueError("The local model path must be a Git working directory.")

    try:
        revision = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=resolved_path,
            check=False,
            capture_output=True,
            text=True,
            shell=False,
        )
    except OSError:
        raise ValueError("Git could not verify the local model checkout.") from None
    if revision.returncode != 0 or revision.stdout.strip() != REVISION:
        raise ValueError("The local model checkout does not match the pinned revision.")

    try:
        clean = subprocess.run(
            [
                "git",
                "diff",
                "--quiet",
                "HEAD",
                "--",
                ".",
                ":(exclude,glob)**/*.safetensors",
            ],
            cwd=resolved_path,
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            shell=False,
        )
    except OSError:
        raise ValueError("Git could not verify the local model working tree.") from None
    if clean.returncode != 0:
        raise ValueError("The local model code/config tree is not clean.")

    return resolved_path


def validate_device(device: str) -> str:
    if device == "cpu" or device == "cuda" or re.fullmatch(r"cuda:\d+", device):
        return device
    raise ValueError("device must be cpu, cuda, or cuda:N")


def create_app(model_path: Path, device: str | None = None) -> FastAPI:
    selected_device = validate_device(device or os.environ.get("CLEF_DEVICE", "cuda:0"))
    runtime = ClefRuntime(selected_device)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        resolved_model_path = model_path
        sys.path.insert(0, str(resolved_model_path))
        official = importlib.import_module("joint_schema_model")
        quantization = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True,
            bnb_4bit_compute_dtype=torch.bfloat16,
        )
        runtime.model, runtime.processor = official.load_release_model(
            str(resolved_model_path),
            device=selected_device,
            dtype=torch.bfloat16,
            quantization_config=quantization,
            low_cpu_mem_usage=True,
        )
        runtime.systemone = official.systemone
        observed = runtime_metadata(runtime)
        if (
            not observed["quantization"]["loaded_in_4bit"]
            or observed["quantization"]["scheme"] != "nf4"
            or not observed["quantization"]["double_quant"]
            or observed["quantization"]["compute_dtype"] != "bfloat16"
            or observed["head"]["dtype"] != "bfloat16"
            or not observed["quantization"]["quantized_linear_layers"]
            or observed["backbone_first_parameter_device"] != canonical_device(selected_device)
            or observed["head"]["device"] != canonical_device(selected_device)
        ):
            raise RuntimeError("Clef did not load with the expected 4-bit/BF16 configuration.")
        try:
            yield
        finally:
            runtime.model = None
            runtime.processor = None
            if str(resolved_model_path) in sys.path:
                sys.path.remove(str(resolved_model_path))

    app = FastAPI(
        title="Local Clef-Flash compatibility service",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
        lifespan=lifespan,
    )

    @app.exception_handler(RequestValidationError)
    async def invalid_request(_: Any, __: RequestValidationError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": "Invalid request."})

    @app.get("/health")
    async def health() -> dict[str, Any]:
        return {
            "status": "ok" if runtime.model is not None else "starting",
            "loaded": runtime.model is not None,
            "model": MODEL_NAME,
            "model_id": MODEL_ID,
            "revision": runtime.revision,
            "device": runtime.device,
            "runtime": runtime_metadata(runtime),
            "max_length": MAX_LENGTH,
            "api_compatibility": "local REST-shaped envelope; not Workers AI",
        }

    @app.post("/client/v4/accounts/{account_id}/ai/run/{model_path:path}")
    async def run_model(
        account_id: str,
        model_path: str,
        request: DecisionRequest,
    ) -> dict[str, Any]:
        del account_id
        if model_path != MODEL_PATH:
            raise HTTPException(status_code=404, detail="Model route not found.")
        if runtime.model is None or runtime.processor is None:
            raise HTTPException(status_code=503, detail="Model is not ready.")

        payload = request.model_dump()
        try:
            async with runtime.inference_lock:
                result = await asyncio.to_thread(
                    runtime.systemone,
                    runtime.model,
                    runtime.processor,
                    payload,
                    MAX_LENGTH,
                )
        except Exception as error:
            # Keep request content and model internals out of HTTP and server logs.
            raise HTTPException(
                status_code=500,
                detail=f"Local inference failed ({type(error).__name__}).",
            ) from None

        return {"success": True, "result": result, "errors": [], "messages": []}

    return app


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--device",
        default=os.environ.get("CLEF_DEVICE", "cuda:0"),
        help="Backbone placement passed to the official loader: cuda:0 by default, or cpu.",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("CLEF_PORT", str(DEFAULT_PORT))),
    )
    parser.add_argument(
        "--model-path",
        type=Path,
        default=os.environ.get("CLEF_MODEL_PATH"),
        help=(
            "Clean Git checkout of Cloudflare/clef-flash at the pinned revision. "
            "Download it yourself first; this service never downloads weights."
        ),
    )
    args = parser.parse_args()
    device = validate_device(args.device)
    if not 1 <= args.port <= 65535:
        parser.error("--port must be between 1 and 65535")
    if device.startswith("cuda") and not torch.cuda.is_available():
        parser.error("CUDA was selected but is not available; use --device cpu")
    try:
        if not args.model_path:
            parser.error("--model-path (or CLEF_MODEL_PATH) is required; download the model first")
        model_path = verify_model_checkout(Path(args.model_path))
    except ValueError as error:
        parser.error(str(error))

    uvicorn.run(
        create_app(model_path, device),
        host="127.0.0.1",
        port=args.port,
        access_log=False,
    )


if __name__ == "__main__":
    main()
