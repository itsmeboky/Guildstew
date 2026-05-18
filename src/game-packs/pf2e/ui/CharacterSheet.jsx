// Read-only character sheet view. Reuses the Forge step's snapshot layout
// without the "Forge Character" CTA. Pass a saved character record as `data`.

import React from 'react';
import StepReview from './steps/StepReview.jsx';

export default function CharacterSheet({ data }) {
  return <StepReview data={data} onForge={() => {}} />;
}
