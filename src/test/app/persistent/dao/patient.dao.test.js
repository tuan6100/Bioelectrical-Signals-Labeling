import { expect } from 'chai';
import sinon from 'sinon';
import Patient from '../../../../main/app/persistence/dao/patient.dao.js';

describe('Patient DAO', () => {
    let mockDb;
    let prepareStub, runStub, getStub, allStub;

    beforeEach(() => {
        runStub = sinon.stub();
        getStub = sinon.stub();
        allStub = sinon.stub();

        prepareStub = sinon.stub().returns({
            run: runStub,
            get: getStub,
            all: allStub
        });

        mockDb = {
            prepare: prepareStub
        };

        Patient.useDb(mockDb);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('inserts a new patient into the database', () => {
        const patient = new Patient('123', 'John', 'Male');
        patient.insert();
        expect(prepareStub.calledOnce).to.be.true;
        expect(prepareStub.firstCall.args[0]).to.equal(`
            INSERT OR IGNORE INTO patients (patient_id, first_name, gender) 
            VALUES (?, ?, ?)
        `);
        expect(runStub.calledWith('123', 'John', 'Male')).to.be.true;
    });

    it('updates an existing patient in the database', () => {
        runStub.returns({ changes: 1 });
        getStub.returns({ patient_id: '123', first_name: 'Jane', gender: 'Female' });
        const updatedPatient = Patient.update('123', { firstName: 'Jane', gender: 'Female' });
        const actualUpdate = prepareStub.getCall(0).args[0];
        const actualSelect = prepareStub.getCall(1).args[0];
        const normalizeSql = s => s.replace(/\s+/g, ' ').trim();
        const expectedUpdate = `
            UPDATE patients 
            SET first_name = ?, gender = ?
            WHERE patient_id = ?
        `;
        const expectedSelect = `
            SELECT patient_id, first_name, gender 
            FROM patients
            WHERE patient_id = ?
        `;
        expect(normalizeSql(actualUpdate)).to.equal(normalizeSql(expectedUpdate))
        expect(normalizeSql(actualSelect)).to.equal(normalizeSql(expectedSelect))
        expect(getStub.calledWith('123')).to.be.true;
        expect(updatedPatient).to.be.instanceOf(Patient);
        expect(updatedPatient).to.deep.include({ patientId: '123', firstName: 'Jane', gender: 'Female' });
    });

    it('returns null when updating a non-existent patient', () => {
        runStub.returns({ changes: 0 });
        const result = Patient.update('999', { firstName: 'NonExistent' });
        expect(result).to.be.null;
    });

    it('finds a patient by ID', () => {
        const normalizeSql = s => s.replace(/\s+/g, ' ').trim();
        getStub.returns({ patient_id: '123', first_name: 'John', gender: 'Male' });
        const patient = Patient.findOneById('123');
        expect(prepareStub.calledOnce).to.be.true;
        const actualSql = prepareStub.firstCall.args[0];
        const expectedSql = `
            SELECT patient_id, first_name, gender
            FROM patients
            WHERE patient_id = ?
        `;
        expect(normalizeSql(actualSql)).to.equal(normalizeSql(expectedSql));
        expect(getStub.calledWith('123')).to.be.true;
        expect(patient).to.be.instanceOf(Patient);
        expect(patient).to.deep.include({ patientId: '123', firstName: 'John', gender: 'Male' });
    });

    it('returns null when finding a non-existent patient by ID', () => {
        getStub.returns(null);
        const patient = Patient.findOneById('999');
        expect(patient).to.be.null;
    });

    it('finds all patients in the database', () => {
        const normalizeSql = s => s.replace(/\s+/g, ' ').trim();
        allStub.returns([
            { patient_id: '123', first_name: 'John', gender: 'Male' },
            { patient_id: '456', first_name: 'Jane', gender: 'Female' }
        ]);
        const patients = Patient.findAll();
        expect(prepareStub.calledOnce).to.be.true;
        const actualSql = prepareStub.firstCall.args[0];
        const expectedSql = `
            SELECT patient_id, first_name, gender
            FROM patients
            ORDER BY patient_id
        `
        expect(normalizeSql(actualSql)).to.equal(normalizeSql(expectedSql));
        expect(allStub.calledOnce).to.be.true;
        expect(patients).to.have.length(2);
        expect(patients[0]).to.deep.include({ patientId: '123', firstName: 'John', gender: 'Male' });
        expect(patients[1]).to.deep.include({ patientId: '456', firstName: 'Jane', gender: 'Female' });
    });

    it('deletes a patient by ID', () => {
        runStub.returns({ changes: 1 });
        const normalizeSql = s => s.replace(/\s+/g, ' ').trim();
        const result = Patient.delete('123');
        expect(prepareStub.calledOnce).to.be.true;
        const actualSql = prepareStub.firstCall.args[0];
        const expectedSql = `
            DELETE FROM patients
            WHERE patient_id = ?
        `
        expect(normalizeSql(actualSql)).to.equal(normalizeSql(expectedSql));
        expect(runStub.calledWith('123')).to.be.true;
        expect(result).to.be.true;
    });

    it('returns false when deleting a non-existent patient', () => {
        runStub.returns({ changes: 0 });
        const result = Patient.delete('999');
        const normalize = s => s.replace(/\s+/g, ' ').trim();
        const expectedSql = `
        DELETE FROM patients
        WHERE patient_id = ?
    `;
        expect(normalize(prepareStub.firstCall.args[0])).to.equal(normalize(expectedSql));
        expect(runStub.calledWith('999')).to.be.true;
        expect(result).to.be.false;
    });
});