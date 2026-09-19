export type ImportedPatient = {
  externalId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
};

export type PmsAdapter = {
  readonly source: string;
  importPatients(): Promise<ImportedPatient[]>;
  writeBackNote(_input: { visitId: string; noteId: string }): Promise<never>;
};

export function createFakePmsAdapter(seed: ImportedPatient[] = []): PmsAdapter {
  return {
    source: "fake",
    async importPatients() {
      return seed;
    },
    async writeBackNote() {
      throw new Error("Open Dental write-back is stubbed (flag odWriteback)");
    },
  };
}
