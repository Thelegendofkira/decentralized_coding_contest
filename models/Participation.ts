import { Schema, model, models, Document } from "mongoose";

export interface IParticipation extends Document {
    contestId: string;
    walletAddress: string;
    joinedAt: Date;
}

const ParticipationSchema = new Schema<IParticipation>(
    {
        contestId: { type: String, required: true, index: true },
        walletAddress: { type: String, required: true, lowercase: true, trim: true },
        joinedAt: { type: Date, default: Date.now },
    }
);

ParticipationSchema.index({ contestId: 1, walletAddress: 1 }, { unique: true });

const Participation =
    models.Participation || model<IParticipation>("Participation", ParticipationSchema);

export default Participation;
