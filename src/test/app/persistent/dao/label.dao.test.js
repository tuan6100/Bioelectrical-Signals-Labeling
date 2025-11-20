import { expect } from 'chai';
import sinon from 'sinon';
import Label from '../../../../main/app/persistence/dao/label.dao.js';

describe('Label DAO', () => {
    let prepareStub, runStub, getStub, allStub;
    const normalizeSql = s => s.replace(/\s+/g, ' ').trim();

    beforeEach(() => {
        runStub = sinon.stub();
        getStub = sinon.stub();
        allStub = sinon.stub();
        prepareStub = sinon.stub().returns({ run: runStub, get: getStub, all: allStub });
        Label.useDb({ prepare: prepareStub });
    });

    afterEach(() => sinon.restore());

    it('inserts a label', () => {
        runStub.returns({ lastInsertRowid: 5 });
        const l = new Label(null, 'Artifact');
        l.insert();
        expect(l.labelId).to.equal(5);
        expect(runStub.calledOnce).to.be.true;
    });

    it('findOneById returns label', () => {
        getStub.returns({ label_id: 7, name: 'Noise', created_at: '2025-01-01T00:00:00Z' });
        const l = Label.findOneById(7);
        expect(l).to.be.instanceOf(Label);
        expect(l.name).to.equal('Noise');
    });

    it('findOneById returns null when not found', () => {
        getStub.returns(undefined);
        expect(Label.findOneById(99)).to.be.null;
    });

    it('findOneByName returns label', () => {
        getStub.returns({ label_id: 2, name: 'Spike', created_at: '2025-01-02T00:00:00Z' });
        const l = Label.findOneByName('Spike');
        expect(l).to.be.instanceOf(Label);
    });

    it('findAll returns list', () => {
        allStub.returns([
            { label_id: 1, name: 'A', created_at: 't1' },
            { label_id: 2, name: 'B', created_at: 't2' }
        ]);
        const list = Label.findAll();
        expect(list).to.have.length(2);
    });

    it('update returns updated label', () => {
        runStub.returns({ changes: 1 });
        prepareStub.onSecondCall().returns({ get: getStub });
        getStub.returns({ label_id: 3, name: 'Updated', created_at: 'X' });
        const updated = Label.update(3, { name: 'Updated' });
        expect(updated).to.be.instanceOf(Label);
        expect(updated.name).to.equal('Updated');
    });

    it('update returns null when no changes', () => {
        runStub.returns({ changes: 0 });
        const updated = Label.update(3, { name: 'Updated' });
        expect(updated).to.be.null;
    });

    it('delete returns true when changes > 0', () => {
        runStub.returns({ changes: 1 });
        expect(Label.delete(5)).to.be.true;
    });

    it('delete returns false when no changes', () => {
        runStub.returns({ changes: 0 });
        expect(Label.delete(5)).to.be.false;
    });
});