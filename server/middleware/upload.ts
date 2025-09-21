import multer, { Multer } from 'multer';

// Configure multer for memory storage
const storage = multer.memoryStorage();
export const upload = multer({ storage });

// CSV parsing function
export const parseCSV = (buffer: Buffer): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    try {
      const results: any[] = [];
      const lines = buffer.toString("utf-8").trim().split("\n");

      for (let i = 0; i < lines.length; i++) {
        const row = lines[i].trim();

        if (row.length > 0) {
          results.push({
            question: row,
            nextQuestion: i + 1 < lines.length ? lines[i + 1].trim() : null,
          });
        }
      }

      if (results.length === 0) {
        return reject(new Error("No valid questions found in the file"));
      }

      resolve(results);
    } catch (error) {
      reject(error);
    }
  });
};