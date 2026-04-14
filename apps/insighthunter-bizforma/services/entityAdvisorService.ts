import { scoreEntities, type EntityScoreInput } from '../lib/scorer';

export function recommendEntity(input: EntityScoreInput) {
  const ranked = scoreEntities(input);
  const [recommendedEntity, score] = ranked[0] || ['LLC', 0];
  return {
    recommendedEntity,
    score,
    ranked,
  };
}
