import { expect } from 'chai';
import sinon from 'sinon';
import Annotation from '../../../../main/app/persistence/dao/annotation.dao.js';

describe('Annotation DAO', () => {
    let prepareStub, runStub, getStub, allStub;

    const normalizeSql = s => s.replace(/\s+/g, ' ').trim();

    beforeEach(() => {
        runStub = sinon.stub();
        getStub = sinon.stub();
        allStub = sinon.stub();
        prepareStub = sinon.stub().returns({ run: runStub, get: getStub, all: allStub });
        Annotation.useDb({ prepare: prepareStub });
    });

    afterEach(() => sinon.restore());

    it('inserts a new annotation', () => {
        runStub.returns({ lastInsertRowid: 42 });
        const a = new Annotation(null, 10, 3, 1000, 1500, 'note');
        a.insert();
        expect(runStub.calledOnce).to.be.true;
        expect(a.annotationId).to.equal(42);

        const sql = prepareStub.firstCall.args[0];
        expect(normalizeSql(sql)).to.equal(normalizeSql(`
        INSERT INTO annotations (
            annotation_id, channel_id, label_id, start_time_ms, end_time_ms, note, labeled_at, updated_at
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `));
    });

    it('finds one by id', () => {
        getStub.returns({
            annotation_id: 1,
            channel_id: 10,
            label_id: 3,
            start_time_ms: 1000,
            end_time_ms: 2000,
            note: 'x'
        });
        const a = Annotation.findOneById(1);
        expect(a).to.be.instanceOf(Annotation);
        expect(a.startTimeMs).to.equal(1000);
        expect(getStub.calledWith(1)).to.be.true;
    });

    it('returns null when findOneById not found', () => {
        getStub.returns(undefined);
        const a = Annotation.findOneById(999);
        expect(a).to.be.null;
    });

    it('finds all annotations ordered by start_time_ms', () => {
        allStub.returns([
            { annotation_id: 1, channel_id: 10, label_id: 3, start_time_ms: 500, end_time_ms: 700, note: 'a' },
            { annotation_id: 2, channel_id: 11, label_id: 4, start_time_ms: 800, end_time_ms: 1200, note: 'b' }
        ]);
        const list = Annotation.findAll();
        expect(list).to.have.length(2);
        expect(list[0].startTimeMs).to.equal(500);
    });

    it('finds by channelId (findBySessionId misnamed perhaps)', () => {
        allStub.returns([
            { annotation_id: 1, channel_id: 22, label_id: 3, start_time_ms: 100, end_time_ms: 200, note: 'n1' }
        ]);
        const result = new Annotation().findByChannelId(22);
        expect(result).to.have.length(1);
        expect(result[0].channelId).to.equal(22);
    });

    it('finds by labelId', () => {
        allStub.returns([
            { annotation_id: 9, channel_id: 2, label_id: 7, start_time_ms: 10, end_time_ms: 20, note: 'L' }
        ]);
        const result = Annotation.findByLabelId(7);
        expect(result).to.have.length(1);
        expect(result[0].labelId).to.equal(7);
    });

    it('finds by time range (overlapping rule)', () => {
        allStub.returns([
            { annotation_id: 5, channel_id: 2, label_id: 1, start_time_ms: 100, end_time_ms: 300, note: 'range' }
        ]);
        const result = Annotation.findByTimeRange(2, 120, 200);
        expect(result).to.have.length(1);
        expect(allStub.calledOnce).to.be.true;
    });

    it('updates fields and returns updated annotation', () => {
        runStub.returns({ changes: 1 });
        // After update, findOneById is called; second prepare returns get stub set to updated row.
        prepareStub.onSecondCall().returns({ get: getStub });
        getStub.returns({
            annotation_id: 77,
            channel_id: 2,
            label_id: 5,
            start_time_ms: 10,
            end_time_ms: 20,
            note: 'updated'
        });
        const updated = Annotation.update(77, { note: 'updated', endTimeMs: 20 });
        expect(updated).to.be.instanceOf(Annotation);
        expect(updated.note).to.equal('updated');
        expect(runStub.called).to.be.true;
    });

    it('returns null when update has no valid fields', () => {
        const res = Annotation.update(7, { bogus: 123 });
        expect(res).to.be.null;
    });

    it('deletes by id', () => {
        runStub.returns({ changes: 1 });
        const ok = Annotation.delete(10);
        expect(ok).to.be.true;
    });

    it('delete returns false when no changes', () => {
        runStub.returns({ changes: 0 });
        const ok = Annotation.delete(11);
        expect(ok).to.be.false;
    });

    it('deleteBySessionId returns number of changes', () => {
        runStub.returns({ changes: 3 });
        const cnt = Annotation.deleteBySessionId(22);
        expect(cnt).to.equal(3);
    });

    it('deleteByLabelId returns number of changes', () => {
        runStub.returns({ changes: 2 });
        const cnt = Annotation.deleteByLabelId(5);
        expect(cnt).to.equal(2);
    });

    it('isOverlapping true when rows returned', () => {
        allStub.returns([{ annotation_id: 1 }]);
        const a = new Annotation(null, 2, 3, 100, 200, 'n');
        const overlap = a.isOverlapping();
        expect(overlap).to.be.true;
    });

    it('canResize returns true when no rows', () => {
        allStub.returns([]);
        const ok = Annotation.canResize(5, 2, 100, 200);
        expect(ok).to.be.true;
    });

    it('canResize returns false when rows overlap', () => {
        allStub.returns([{ annotation_id: 9 }]);
        const ok = Annotation.canResize(5, 2, 100, 200);
        expect(ok).to.be.false;
    });
});