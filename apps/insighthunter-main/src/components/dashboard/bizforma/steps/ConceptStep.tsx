import React from 'react';
import { useStore } from '@nanostores/react';
import { formData, updateFormData } from '../../stores/wizard';

export const ConceptStep: React.FC = () => {
  const $formData = useStore(formData);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    updateFormData('concept', { ...$formData.concept, [e.target.name]: e.target.value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold">Describe Your Business</h3>
        <p className="text-gray-500">What is your business idea? Be as descriptive as you can.</p>
      </div>
      <textarea
        name="businessIdea"
        rows={5}
        className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500"
        placeholder="e.g., A mobile coffee cart that serves specialty coffee and pastries in local parks and at events."
        onChange={handleChange}
        value={$formData.concept.businessIdea || ''}
      />

      <div>
        <h3 className="text-xl font-semibold">Industry</h3>
        <p className="text-gray-500">What industry will you operate in?</p>
      </div>
      <input
        type="text"
        name="industry"
        className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500"
        placeholder="e.g., Food & Beverage, Technology, Retail"
        onChange={handleChange}
        value={$formData.concept.industry || ''}
      />
    </div>
  );
};