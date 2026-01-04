import { expect } from 'chai';
import sinon from 'sinon';
import Label from "@biosignal/app/persistence/dao/label.dao.js";
import Annotation from "@biosignal/app/persistence/dao/annotation.dao.js";
import Channel from "@biosignal/app/persistence/dao/channel.dao.js";
import Session from "@biosignal/app/persistence/dao/session.dao.js";
import * as LabelCommand from "@biosignal/app/domain/services/data/command/label.command.js";
import * as TransactionMod from "@biosignal/app/persistence/transaction";

describe('label.command createAnnotation', () => {
    let asTxStub;
    let labelFindByNameStub, labelInsertStub, annotationInsertStub, annotationOverlapStub;
    let channelDurationStub, channelFindSessionStub, sessionTouchStub;

    beforeEach(() => {
        asTxStub = sinon.stub(TransactionMod, 'default' in TransactionMod ? TransactionMod.default : TransactionMod.asTransaction)
            .callsFake(cb => (...args) => cb(...args));

        // Stubs for Label
        labelFindByNameStub = sinon.stub(Label, 'findOneByName');
        labelInsertStub = sinon.stub(Label.prototype, 'insert').callsFake(function () {
            this.labelId = this.labelId ?? 101;
            return this;
        });

        // Annotation
        annotationInsertStub = sinon.stub(Annotation.prototype, 'insert').callsFake(function () {
            this.annotationId = this.annotationId ?? 555;
            return this;
        });
        annotationOverlapStub = sinon.stub(Annotation.prototype, 'isOverlapping');

        // Channel / Session
        channelDurationStub = sinon.stub(Channel, 'findOneDurationById');
        channelFindSessionStub = sinon.stub(Channel, 'findSessionIdByChannelId');
        sessionTouchStub = sinon.stub(Session, 'toggleStatus');
    });

    afterEach(() => sinon.restore());

    it('creates new label when not existing and persists annotation', () => {
        labelFindByNameStub.returns(null);
        annotationOverlapStub.returns(false);
        channelDurationStub.returns({ sweepDurationMs: 2000 });
        channelFindSessionStub.returns(999);

        const result = LabelCommand.persistLabel(10, 100, 500, 'NewLabel', 'note1');

        expect(labelFindByNameStub.calledWith('NewLabel')).to.be.true;
        expect(labelInsertStub.calledOnce).to.be.true;
        expect(annotationInsertStub.calledOnce).to.be.true;
        expect(sessionTouchStub.calledWith(999)).to.be.true;
        expect(result).to.include({
            channelId: 10,
            labelName: 'NewLabel',
            startTimeMs: 100,
            endTimeMs: 500,
            note: 'note1'
        });
        expect(result.annotationId).to.equal(555);
    });

    it('uses existing label without reinserting', () => {
        labelFindByNameStub.returns({ labelId: 7, name: 'Existing' });
        annotationOverlapStub.returns(false);
        channelDurationStub.returns({ sweepDurationMs: 1000 });
        channelFindSessionStub.returns(null); // no session toggleStatus

        const result = LabelCommand.persistLabel(11, 0, 200, 'Existing');
        expect(labelInsertStub.notCalled).to.be.true;
        expect(result.labelId).to.equal(7);
        expect(sessionTouchStub.notCalled).to.be.true;
    });

    it('throws error if startTime negative', () => {
        labelFindByNameStub.returns({ labelId: 1, name: 'X' });
        annotationOverlapStub.returns(false);
        channelDurationStub.returns({ traceDurationMs: 1000 });

        expect(() => LabelCommand.persistLabel(1, -1, 50, 'X')).to.throw('Annotation time cannot be negative.');
    });

    it('throws error if endTime <= startTime', () => {
        labelFindByNameStub.returns({ labelId: 1, name: 'L' });
        annotationOverlapStub.returns(false);
        channelDurationStub.returns({ sweepDurationMs: 1000 });

        expect(() => LabelCommand.persistLabel(1, 100, 100, 'L')).to.throw('Annotation end time must be greater than start time.');
    });

    it('throws error if endTime exceeds channel duration', () => {
        labelFindByNameStub.returns({ labelId: 1, name: 'L' });
        annotationOverlapStub.returns(false);
        channelDurationStub.returns({ sweepDurationMs: 300 });

        expect(() => LabelCommand.persistLabel(1, 50, 400, 'L')).to.throw('Annotation end time exceeds channel duration.');
    });

    it('throws error on overlapping annotation', () => {
        labelFindByNameStub.returns({ labelId: 1, name: 'L' });
        annotationOverlapStub.returns(true);
        channelDurationStub.returns({ sweepDurationMs: 1000 });

        expect(() => LabelCommand.persistLabel(1, 10, 20, 'L')).to.throw('Annotation time range is overlapping with an existing annotation.');
    });
});

describe('label.command updateLabel/deleteLabel', () => {
    let asTxStub, updateStub, deleteStub;

    beforeEach(() => {
        asTxStub = sinon.stub(TransactionMod, 'default' in TransactionMod ? TransactionMod.default : TransactionMod.asTransaction)
            .callsFake(cb => (...args) => cb(...args));

        updateStub = sinon.stub(Label, 'update');
        deleteStub = sinon.stub(Label, 'delete');
    });

    afterEach(() => sinon.restore());

    it('updateLabel returns updated label object', () => {
        updateStub.returns({ labelId: 10, name: 'Edited' });
        const res = LabelCommand.updateLabel(10, { name: 'Edited' });
        expect(updateStub.calledWith(10, { name: 'Edited' })).to.be.true;
        expect(res.name).to.equal('Edited');
    });

    it('updateLabel returns null when DAO returns null', () => {
        updateStub.returns(null);
        const res = LabelCommand.updateLabel(20, { name: 'Nope' });
        expect(res).to.be.null;
    });

    it('deleteLabel returns true/false based on DAO', () => {
        deleteStub.onFirstCall().returns(true);
        deleteStub.onSecondCall().returns(false);

        expect(LabelCommand.deleteLabel(1)).to.be.true;
        expect(LabelCommand.deleteLabel(2)).to.be.false;
    });
});

describe('label.command updateAnnotation/deleteAnnotation', () => {
    let asTxStub;
    let findAnnStub, updateAnnStub, findLabelStub, canResizeStub, findSessionStub, sessionTouchStub, deleteAnnStub, labelFindByNameStub, labelInsertStub, channelDurationStub;

    beforeEach(() => {
        asTxStub = sinon.stub(TransactionMod, 'default' in TransactionMod ? TransactionMod.default : TransactionMod.asTransaction)
            .callsFake(cb => (...args) => cb(...args));

        findAnnStub = sinon.stub(Annotation, 'findOneById');
        updateAnnStub = sinon.stub(Annotation, 'update');
        findLabelStub = sinon.stub(Label, 'findOneById');
        canResizeStub = sinon.stub(Annotation, 'canResize');
        findSessionStub = sinon.stub(Channel, 'findSessionIdByChannelId');
        sessionTouchStub = sinon.stub(Session, 'toggleStatus');
        deleteAnnStub = sinon.stub(Annotation, 'delete');
        labelFindByNameStub = sinon.stub(Label, 'findOneByName');
        labelInsertStub = sinon.stub(Label.prototype, 'insert').callsFake(function () {
            this.labelId = this.labelId ?? 202;
            return this;
        });
        channelDurationStub = sinon.stub(Channel, 'findOneDurationById');
    });

    afterEach(() => sinon.restore());

    it('throws if annotation not found', () => {
        findAnnStub.returns(null);
        expect(() => LabelCommand.updateAnnotation(1, { note: 'n' }))
            .to.throw('Annotation 1 not found');
    });

    it('creates new label when labelName provided and not exists', () => {
        findAnnStub.returns({
            annotationId: 5,
            channelId: 9,
            startTimeMs: 100,
            endTimeMs: 200,
            note: 'old',
            labelId: 1
        });
        labelFindByNameStub.returns(null);
        channelDurationStub.returns({ sweepDurationMs: 500 });
        canResizeStub.returns(true);
        updateAnnStub.returns({
            annotationId: 5,
            channelId: 9,
            labelId: 202,
            startTimeMs: 100,
            endTimeMs: 200,
            note: 'old',
            labeledAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        findSessionStub.returns(777);
        findLabelStub.returns({ labelId: 202, name: 'NewMade' });

        const res = LabelCommand.updateAnnotation(5, { labelName: 'NewMade' });
        expect(labelInsertStub.calledOnce).to.be.true;
        expect(res.labelName).to.equal('NewMade');
        expect(sessionTouchStub.calledWith(777)).to.be.true;
    });

    it('validates time updates (end <= start)', () => {
        findAnnStub.returns({
            annotationId: 5,
            channelId: 9,
            startTimeMs: 100,
            endTimeMs: 200,
            labelId: 1
        });
        channelDurationStub.returns({ traceDurationMs: 1000 });
        expect(() => LabelCommand.updateAnnotation(5, { startTimeMs: 300, endTimeMs: 300 }))
            .to.throw('Annotation end time must be greater than start time.');
    });

    it('validates negative times', () => {
        findAnnStub.returns({
            annotationId: 5,
            channelId: 9,
            startTimeMs: 100,
            endTimeMs: 200,
            labelId: 1
        });
        channelDurationStub.returns({ sweepDurationMs: 1000 });
        expect(() => LabelCommand.updateAnnotation(5, { startTimeMs: -5 }))
            .to.throw('Annotation time cannot be negative.');
    });

    it('validates channel duration exceed', () => {
        findAnnStub.returns({
            annotationId: 5,
            channelId: 9,
            startTimeMs: 100,
            endTimeMs: 200,
            labelId: 1
        });
        channelDurationStub.returns({ sweepDurationMs: 150 });
        expect(() => LabelCommand.updateAnnotation(5, { endTimeMs: 300 }))
            .to.throw('Annotation end time exceeds channel duration.');
    });

    it('throws overlap error if canResize false', () => {
        findAnnStub.returns({
            annotationId: 5, channelId: 9, startTimeMs: 100, endTimeMs: 200, labelId: 1
        });
        channelDurationStub.returns({ sweepDurationMs: 1000 });
        canResizeStub.returns(false);
        expect(() => LabelCommand.updateAnnotation(5, { endTimeMs: 250 }))
            .to.throw('Annotation time range is overlapping with an existing annotation.');
    });

    it('throws if update returns null', () => {
        findAnnStub.returns({
            annotationId: 5, channelId: 9, startTimeMs: 100, endTimeMs: 200, labelId: 1
        });
        channelDurationStub.returns({ sweepDurationMs: 1000 });
        canResizeStub.returns(true);
        updateAnnStub.returns(null);
        expect(() => LabelCommand.updateAnnotation(5, { note: 'x' })).to.throw('Failed to update annotation');
    });

    it('deleteAnnotation touches session when deleted', () => {
        findAnnStub.returns({ annotationId: 9, channelId: 33 });
        deleteAnnStub.returns(true);
        findSessionStub.returns(321);

        const res = LabelCommand.deleteAnnotation(9);
        expect(res).to.be.true;
        expect(sessionTouchStub.calledWith(321)).to.be.true;
    });

    it('deleteAnnotation returns false when not deleted', () => {
        findAnnStub.returns({ annotationId: 9, channelId: 33 });
        deleteAnnStub.returns(false);
        const res = LabelCommand.deleteAnnotation(9);
        expect(res).to.be.false;
        expect(sessionTouchStub.notCalled).to.be.true;
    });
});