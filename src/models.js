import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Single fat-document Session schema.
 * Players, teams, submissions, aggregates and finalAnswers are embedded
 * subdocuments so each session is one Mongo document — simple and fast for
 * the prototype's single-venue scale.
 *
 * Complex nested shapes (timer, config, aggregates, etc.) use Mixed so we
 * don't have to mirror every field change here during iteration.
 */
const SessionSchema = new Schema(
  {
    id:                   String,
    joinCode:             { type: String, required: true, unique: true },
    hostToken:            String,
    name:                 String,
    venueName:            String,
    theme:                String,
    phase:                String,
    version:              Number,
    config:               Schema.Types.Mixed,
    timer:                Schema.Types.Mixed,   // null | { durationSec, phaseStartedAt, ... }
    currentQuestionIndex: Number,
    questions:            [Schema.Types.Mixed],
    teams:                [Schema.Types.Mixed],
    players:              [Schema.Types.Mixed],
    submissions:          [Schema.Types.Mixed],
    finalAnswers:         [Schema.Types.Mixed],
    aggregates:           [Schema.Types.Mixed],
    createdAt:            Number,
    updatedAt:            Number,
  },
  { versionKey: false },
);

export const SessionModel = mongoose.model('Session', SessionSchema);
