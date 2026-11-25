import { Service } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
import { System1Engine } from './core/engine.js';
import { locateOperation, toLocateResult } from './contracts/locate.js';
import { operationIdPattern } from './contracts/operation.js';
import { installSettingsBridge } from './settings-bridge.js';
export { defineOperation } from './contracts/operation.js';
export { locateOperation, toUtf16Range } from './contracts/locate.js';
export { decideOperation } from './contracts/decide.js';
export { System1InputError, System1OperationDisabledError, System1ProviderError } from './contracts/error.js';
const reference = () => Schema.object({
    provider: Schema.string().required(),
    model: Schema.string().required(),
});
const optionalReference = () => Schema.union([Schema.const(undefined), reference()]);
export default class System1Service extends Service {
    // Keep the public contract despite Schemastery's invariant object-schema types.
    static Config = Schema.object({
        defaultModel: optionalReference().volatile(),
        fallbackModels: Schema.array(reference()).default([]).volatile(),
        operations: Schema.dict(Schema.object({
            enabled: Schema.boolean(),
            version: Schema.number().min(1).max(Number.MAX_SAFE_INTEGER).step(1),
            defaultModel: optionalReference(),
            fallbackModels: Schema.array(reference()),
            agentEnabled: Schema.boolean(),
        }), Schema.string().pattern(operationIdPattern)).default({}).volatile(),
    });
    engine;
    mountedTools = new Set();
    decisionToolAttached = false;
    constructor(ctx, config = {}) {
        super(ctx, 'system1');
        this.engine = new System1Engine(() => {
            const defaultModel = readConfigValue(config.defaultModel);
            const fallbackModels = readConfigValue(config.fallbackModels);
            return {
                ...(defaultModel !== undefined ? { defaultModel } : {}),
                ...(fallbackModels !== undefined ? { fallbackModels } : {}),
                operations: readConfigValue(config.operations),
            };
        });
        this.registerOperation(locateOperation);
        ctx.effect(() => () => this.engine.dispose());
        ctx.on('loader/volatile-update', () => this.engine.operations.registry.changed());
        installSettingsBridge(ctx, this);
    }
    decide(request) {
        return this.engine.decide(request);
    }
    async locate(input, options) {
        return toLocateResult(await this.run(locateOperation, input, options));
    }
    registerOperation(operation) {
        return this.engine.operations.registry.registerOperation(operation);
    }
    registerImplementation(operation, id, provider) {
        return this.engine.registerImplementation(operation, id, provider, (message) => {
            this.ctx.logger(`dsh-system1 ${id} provider`).warn(message);
        });
    }
    run(operation, input, options) {
        return this.engine.run(operation, input, options);
    }
    getCatalog() {
        return this.engine.operations.getCatalog(this.mountedTools, this.decisionToolAttached);
    }
    subscribeCatalog(listener) {
        return this.engine.operations.registry.subscribe(listener);
    }
    getAgentTools() {
        return this.engine.operations.getAgentTools();
    }
    isOperationEnabled(id) {
        return this.engine.operations.isOperationEnabled(id);
    }
    /** Keep the legacy tool component preference separate from actual tool registration. */
    setDecisionToolAttached(attached) {
        if (this.decisionToolAttached === attached)
            return;
        this.decisionToolAttached = attached;
        this.engine.operations.registry.changed();
    }
    /** Called by the tool host after a real registration or unregistration. */
    setOperationToolMounted(name, mounted) {
        if (this.mountedTools.has(name) === mounted)
            return;
        if (mounted)
            this.mountedTools.add(name);
        else
            this.mountedTools.delete(name);
        this.engine.operations.registry.changed();
    }
}
function readConfigValue(value) {
    if (value !== null &&
        typeof value === 'object' &&
        'get' in value &&
        typeof value.get === 'function')
        return value.get();
    return value;
}
//# sourceMappingURL=index.js.map