import { expect } from 'chai';
import sinon from 'sinon';
import Session from '../../../../main/app/persistence/dao/session.dao.js';

describe('Session DAO', () => {
    let prepareStub, runStub, getStub, allStub;
    const normalizeSql = s => s.replace(/\s+/g, ' ').trim();

    beforeEach(() => {
        runStub = sinon.stub();
        getStub = sinon.stub();
        allStub = sinon.stub();
        prepareStub = sinon.stub().returns({ run: runStub, get: getStub, all: allStub });
        Session.useDb({ prepare: prepareStub });
    });

    afterEach(() => sinon.restore());

    it('inserts a session (assigns lastInsertRowid if no sessionId)', () => {
        runStub.returns({ lastInsertRowid: 100 });
        const s = new Session(null, 'P1', 'ECG', '2025-01-01T00:00:00Z', '2025-01-01T00:10:00Z', 'file.dat', 'hash123', null);
        s.insert();
        expect(s.sessionId).to.equal(100);
        expect(s.updatedAt).to.be.a('string');
    });

    it('toggleStatus updates updated_at', () => {
        runStub.returns({ changes: 1 });
        Session.toggleStatus(77);
        expect(runStub.calledOnce).to.be.true;
        const sql = normalizeSql(prepareStub.firstCall.args[0]);
        expect(sql).to.match(/UPDATE sessions SET updated_at = \?/);
    });

    it('countAll returns total', () => {
        getStub.returns({ total: 5 });
        const total = Session.countAll();
        expect(total).to.equal(5);
    });

    it('findOneById returns null if not found', () => {
        getStub.returns(undefined);
        const s = Session.findOneById(9);
        expect(s).to.be.null;
    });

    it('findOneById returns session', () => {
        getStub.returns({
            session_id: 10,
            patient_id: 'PX',
            measurement_type: 'EEG',
            start_time: 't1',
            end_time: 't2',
            input_file_name: 'f',
            content_hash: 'h',
            updated_at: 'u'
        });
        const s = Session.findOneById(10);
        expect(s).to.be.instanceOf(Session);
        expect(s.patientId).to.equal('PX');
    });

    it('findAll returns mapped sessions', () => {
        allStub.returns([
            {
                session_id: 1, patient_id: 'P1', measurement_type: 'ECG',
                start_time: 't1', end_time: 't2', input_file_name: 'f', content_hash: 'h', updated_at: 'u'
            }
        ]);
        const list = Session.findAll();
        expect(list).to.have.length(1);
    });

    it('findAllWithPagination returns rows', () => {
        allStub.returns([
            {
                session_id: 2, patient_id: 'P2', measurement_type: 'ECG',
                start_time: 't1', end_time: 't2', input_file_name: 'f', updated_at: 'u',
                patient_name: 'John', patient_gender: 'M'
            }
        ]);
        const pageRows = Session.findAllWithPagination(1, 10);
        expect(pageRows).to.have.length(1);
        expect(allStub.calledWith(10, 0)).to.be.true;
    });

    it('findByPatientId returns rows', () => {
        allStub.returns([
            { session_id: 3, patient_id: 'P3', measurement_type: 'ECG', start_time: 't', end_time: 't2', input_file_name: 'f', updated_at: 'u' }
        ]);
        const rows = Session.findByPatientId('P3');
        expect(rows).to.have.length(1);
    });

    it('findSessionIdByContentHash returns id', () => {
        getStub.returns({ session_id: 77 });
        const id = Session.findSessionIdByContentHash('hashX');
        expect(id).to.equal(77);
    });

    it('findSessionIdByContentHash returns null when missing', () => {
        getStub.returns(undefined);
        const id = Session.findSessionIdByContentHash('hashX');
        expect(id).to.be.null;
    });

    it('update returns updated session', () => {
        runStub.returns({ changes: 1 });
        prepareStub.onSecondCall().returns({ get: getStub });
        getStub.returns({
            session_id: 5,
            patient_id: 'P5',
            measurement_type: 'ECG',
            start_time: 't1',
            end_time: 't2',
            input_file_name: 'f',
            content_hash: 'hash5',
            updated_at: 'now'
        });
        const updated = Session.update(5, { measurementType: 'ECG' });
        expect(updated).to.be.instanceOf(Session);
    });

    it('update returns null when no changes', () => {
        runStub.returns({ changes: 0 });
        const updated = Session.update(5, { measurementType: 'ECG' });
        expect(updated).to.be.null;
    });

    it('delete returns true when changes > 0', () => {
        runStub.returns({ changes: 1 });
        expect(Session.delete(5)).to.be.true;
    });

    it('delete returns false when no changes', () => {
        runStub.returns({ changes: 0 });
        expect(Session.delete(5)).to.be.false;
    });

    it('deleteByPatientId returns count', () => {
        runStub.returns({ changes: 3 });
        expect(Session.deleteByPatientId('P9')).to.equal(3);
    });

    it('findAllRelatedById returns null when empty', () => {
        allStub.returns([]);
        const res = Session.findAllRelatedById(1);
        expect(res).to.be.null;
    });

    it('findAllRelatedById returns aggregated result', () => {
        allStub.returns([
            {
                patient_id: 'P1',
                patient_first_name: 'Alice',
                patient_gender: 'F',
                session_start_time: '2025-01-01T00:00:00Z',
                session_end_time: '2025-01-01T01:00:00Z',
                session_updated_at: '2025-01-01T01:00:00Z',
                channel_id: 10,
                channel_number: 1,
                channel_data_kind: 'ECG',
                channel_sweep_index: 0
            },
            {
                patient_id: 'P1',
                patient_first_name: 'Alice',
                patient_gender: 'F',
                session_start_time: '2025-01-01T00:00:00Z',
                session_end_time: '2025-01-01T01:00:00Z',
                session_updated_at: '2025-01-01T01:00:00Z',
                channel_id: 11,
                channel_number: 2,
                channel_data_kind: 'EEG',
                channel_sweep_index: 1
            }
        ]);
        const res = Session.findAllRelatedById(5);
        expect(res.channels).to.have.length(2);
        expect(res.patientFirstName).to.equal('Alice');
    });

    it('getAllLabelsBySessionId returns mapped array', () => {
        allStub.returns([
            {
                channel_id: 10,
                channel_number: 1,
                samples: JSON.stringify([1,2]),
                sampling_frequency: 10,
                subsampled: 5,
                annotation_id: 2,
                start_time_ms: 100,
                end_time_ms: 200,
                note: 'N',
                label_id: 7,
                label_name: 'Spike'
            }
        ]);
        const rows = Session.getAllLabelsBySessionId(5);
        expect(rows).to.have.length(1);
        expect(rows[0].annotation.labelId).to.equal(7);
    });
});