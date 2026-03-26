import mongoose, { Schema, Document } from 'mongoose';

export interface ISubmission extends Document {
    _id: mongoose.Types.ObjectId;
    registerNumber: string;
    userName: string;
    department: string;
    section: string;
    year: string;
    assignedQuestion: string;
    code: string;
    language: string;
    examId: string;
    submittedAt: Date;
    status: 'submitted' | 'graded';
}

const SubmissionSchema: Schema = new Schema({
    registerNumber: {
        type: String,
        required: true,
        trim: true
    },
    userName: {
        type: String,
        required: true,
        trim: true
    },
    department: {
        type: String,
        required: true,
        trim: true
    },
    section: {
        type: String,
        required: true,
        trim: true
    },
    year: {
        type: String,
        required: true,
        trim: true
    },
    assignedQuestion: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true
    },
    language: {
        type: String,
        required: true,
        enum: ['javascript', 'python', 'java', 'c', 'cpp'],
        default: 'javascript'
    },
    examId: {
        type: String,
        required: true,
        trim: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['submitted', 'graded'],
        default: 'submitted'
    }
}, {
    timestamps: true
});

SubmissionSchema.index({ registerNumber: 1, examId: 1 }, { unique: true });
SubmissionSchema.index({ submittedAt: -1 });

export default mongoose.model<ISubmission>('Submission', SubmissionSchema);