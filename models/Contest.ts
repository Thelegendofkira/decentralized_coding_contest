import mongoose, { Schema, model, models, Document } from "mongoose";

export interface ITestCase {
    input: string;
    expectedOutput: string;
}

export interface IQuestion {
    title: string;
    description: string;
    testCases: ITestCase[];
}

export interface IContest extends Document {
    name: string;
    timeLimitMinutes: number;
    questions: IQuestion[];
    createdAt: Date;
}

const TestCaseSchema = new Schema<ITestCase>({
    input: { type: String, required: true },
    expectedOutput: { type: String, required: true },
});

const QuestionSchema = new Schema<IQuestion>({
    title: { type: String, required: true },
    description: { type: String, required: true },
    testCases: { type: [TestCaseSchema], default: [] },
});

const ContestSchema = new Schema<IContest>(
    {
        name: { type: String, required: true, trim: true },
        timeLimitMinutes: { type: Number, required: true, min: 1 },
        questions: { type: [QuestionSchema], default: [] },
    },
    { timestamps: true }
);

const Contest = models.Contest || model<IContest>("Contest", ContestSchema);

export default Contest;
