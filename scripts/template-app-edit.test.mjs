import test from 'node:test'
import assert from 'node:assert/strict'
import { applyTemplateAppEdit } from '../src/utils/template-app-edit.mjs'

test('unchanged form output preserves the original deployment', () => {
    const original = { spec: { template: { spec: { containers: [{ name: 'server', image: 'k3s', command: ['sh', '-c', 'long script'], startupProbe: { tcpSocket: { port: 6443 } } }] } } } }
    const serialized = { spec: { template: { spec: { containers: [{ name: 'server', image: 'k3s', command: ['sh', '-c', 'long script'], resources: { limits: { cpu: '0' } } }] } } } }
    assert.deepEqual(applyTemplateAppEdit(original, serialized, structuredClone(serialized)), original)
})

test('editing image preserves hidden container fields and purchased resource settings', () => {
    const original = { spec: { template: { spec: { containers: [{ name: 'server', image: 'old', startupProbe: { tcpSocket: { port: 6443 } }, resources: { limits: { cpu: '2' } } }] } } } }
    const baseline = { spec: { template: { spec: { containers: [{ name: 'server', image: 'old', resources: { limits: { cpu: '0' } } }] } } } }
    const edited = structuredClone(baseline)
    edited.spec.template.spec.containers[0].image = 'new'
    const result = applyTemplateAppEdit(original, baseline, edited)
    assert.equal(result.spec.template.spec.containers[0].image, 'new')
    assert.deepEqual(result.spec.template.spec.containers[0].resources, original.spec.template.spec.containers[0].resources)
    assert.deepEqual(result.spec.template.spec.containers[0].startupProbe, original.spec.template.spec.containers[0].startupProbe)
})

test('nested edits and container reordering retain fields absent from the form', () => {
    const original = { spec: { template: { spec: { containers: [
        { name: 'server', image: 'old', env: [{ name: 'MODE', value: 'old', extra: 'keep' }], startupProbe: { exec: { command: ['true'] } } },
        { name: 'sidecar', image: 'helper', terminationMessagePolicy: 'FallbackToLogsOnError' },
    ] } } } }
    const baseline = { spec: { template: { spec: { containers: [
        { name: 'server', image: 'old', env: [{ name: 'MODE', value: 'old' }] },
        { name: 'sidecar', image: 'helper' },
    ] } } } }
    const edited = structuredClone(baseline)
    edited.spec.template.spec.containers[0].env[0].value = 'new'
    edited.spec.template.spec.containers.reverse()
    const result = applyTemplateAppEdit(original, baseline, edited).spec.template.spec.containers
    assert.equal(result[0].name, 'sidecar')
    assert.equal(result[0].terminationMessagePolicy, 'FallbackToLogsOnError')
    assert.deepEqual(result[1].env, [{ name: 'MODE', value: 'new', extra: 'keep' }])
    assert.deepEqual(result[1].startupProbe, original.spec.template.spec.containers[0].startupProbe)
})
