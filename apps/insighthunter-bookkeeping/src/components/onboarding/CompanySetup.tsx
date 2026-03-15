import React from 'react';

interface CompanySetupProps {
  onComplete: () => void;
}

const CompanySetup: React.FC<CompanySetupProps> = ({ onComplete }) => {
  return (
    <div>
      <h2>Company Setup</h2>
      <p>This is a placeholder for the company setup form.</p>
      <button onClick={onComplete}>Complete</button>
    </div>
  );
};

export default CompanySetup;
