import { expect } from 'chai';
import sinon from 'sinon';
import Channel from '../../../../main/app/persistence/dao/channel.dao.js';

describe('Channel DAO', () => {
    let prepareStub, runStub, getStub, allStub, transactionStub;

    const normalizeSql = s => s.replace(/\s+/g, ' ').trim();

    beforeEach(() => {
        runStub = sinon.stub();
        getStub = sinon.stub();
        allStub = sinon.stub();
        transactionStub = sinon.stub().callsFake(fn => (...args) => fn(...args));
        prepareStub = sinon.stub().returns({ run: runStub, get: getStub, all: allStub });
        Channel.useDb({ prepare: prepareStub, transaction: transactionStub });
    });

    afterEach(() => sinon.restore());

    it('inserts a channel', () => {
        runStub.returns({ lastInsertRowid: 99 });
        const ch = new Channel(null, 1, 2, 'ECG', 0, [1,2,3], 10, 5, 1000, 2000, 'alg');
        ch.insert();
        expect(ch.channelId).to.equal(99);
        expect(runStub.calledOnce).to.be.true;
    });

    it('insertBatch sets channelIds', () => {
        runStub.returns({ lastInsertRowid: 50 });
        const channels = [
            new Channel(null, 1, 1, 'ECG', 0, [0], 10, 5, 100, 200, 'alg'),
            new Channel(null, 1, 2, 'EEG', 1, [1], 10, 5, 100, 200, 'alg')
        ];
        Channel.insertBatch(channels);
        expect(runStub.callCount).to.equal(2);
        expect(channels[0].channelId).to.equal(50);
    });

    it('findOneById returns null when not found', () => {
        getStub.returns(undefined);
        const c = Channel.findOneById(123);
        expect(c).to.be.null;
    });

    it('findOneById maps row to Channel', () => {
        getStub.returns({
            channel_id: 10,
            session_id: 1,
            channel_number: 2,
            data_kind: 'ecg',
            sweep_index: 0,
            sampling_frequency_khz: 10,
            subsampled_khz: 5,
            sweep_duration_ms: 100,
            trace_duration_ms: 200,
            algorithm: 'alg'
        });
        const c = Channel.findOneById(10);
        // After code fix expected instanceOf Channel
        expect(c).to.be.instanceOf(Channel);
    });

    it('findAll maps rows', () => {
        allStub.returns([
            {
                channel_id: 1, session_id: 1, channel_number: 1, data_kind: 'ecg', sweep_index: 0,
                sampling_frequency_khz: 10, subsampled_khz: 5, sweep_duration_ms: 100, trace_duration_ms: 200, algorithm: 'alg'
            }
        ]);
        const list = Channel.findAll();
        expect(list).to.have.length(1);
    });

    it('findBySessionId returns list', () => {
        allStub.returns([
            {
                channel_id: 3, session_id: 7, channel_number: 2, data_kind: 'eeg', sweep_index: 1,
                sampling_frequency_khz: 20, subsampled_khz: 10, sweep_duration_ms: 50, trace_duration_ms: 75, algorithm: 'alg'
            }
        ]);
        console.log(list)
        expect(allStub.calledWith(7)).to.be.true;
        expect(list[0].channelNumber).to.equal(2);
    });

    it('findByDataKindAndSweepIndex without sweepIndex', () => {
        getStub.returns({ channel_id: 55 });
        const id = Channel.findByDataKindAndSweepIndex(1, 'ECG', null);
        expect(id).to.equal(55);
    });

    it('findByDataKindAndSweepIndex with sweepIndex', () => {
        // Ensure second branch passes all args (requires DAO fix)
        getStub.returns({ channel_id: 77 });
        const id = Channel.findByDataKindAndSweepIndex(1, 'EEG', 2);
        expect(id).to.equal(77);
    });

    it('findSamplesById returns enriched rows', () => {
        allStub.returns([
            {
                raw_samples_uv: JSON.stringify([1,2]),
                sampling_frequency_khz: 10,
                subsampled_khz: 5,
                sweep_duration_ms: 100,
                trace_duration_ms: 200,
                annotation_id: 9,
                start_time_ms: 10,
                end_time_ms: 20,
                note: 'n',
                labeled_at: '2025-01-01T00:00:00Z',
                updated_at: null,
                label_id: 3,
                label_name: 'Artifact'
            }
        ]);
        const rows = Channel.findSamplesById(5);
        expect(allStub.calledWith(5)).to.be.true;
        expect(rows[0].annotation_id).to.equal(9);
    });

    it('update returns updated channel', () => {
        runStub.returns({ changes: 1 });
        prepareStub.onSecondCall().returns({ get: getStub });
        getStub.returns({
            channel_id: 10,
            session_id: 1,
            channel_number: 2,
            data_kind: 'ecg',
            sweep_index: 0,
            sampling_frequency_khz: 12,
            subsampled_khz: 6,
            sweep_duration_ms: 100,
            trace_duration_ms: 200,
            algorithm: 'alg2'
        });
        const updated = Channel.update(10, { samplingFrequencyKhz: 12, algorithm: 'alg2' });
        expect(updated).to.be.instanceOf(Channel);
    });

    it('update returns null when no changes', () => {
        runStub.returns({ changes: 0 });
        const updated = Channel.update(10, { algorithm: 'a' });
        expect(updated).to.be.null;
    });

    it('delete returns true when changes > 0', () => {
        runStub.returns({ changes: 1 });
        expect(Channel.delete(10)).to.be.true;
    });

    it('delete returns false when no changes', () => {
        runStub.returns({ changes: 0 });
        expect(Channel.delete(10)).to.be.false;
    });

    it('deleteBySessionId returns number of changes', () => {
        runStub.returns({ changes: 4 });
        expect(Channel.deleteBySessionId(3)).to.equal(4);
    });

    it('findSessionIdByChannelId returns session id', () => {
        getStub.returns({ session_id: 8 });
        const sid = Channel.findSessionIdByChannelId(99);
        expect(sid).to.equal(8);
    });

    it('findSessionIdByChannelId returns null when missing', () => {
        getStub.returns(undefined);
        const sid = Channel.findSessionIdByChannelId(99);
        expect(sid).to.be.null;
    });
});