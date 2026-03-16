import React from 'react';

interface HeroCardProps {
  icon: string;
  titlePrefix: string;
  titleMain: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  image: string; 
}

export const HeroCard: React.FC<HeroCardProps> = ({ icon, titlePrefix, titleMain, description, ctaText, ctaLink, image }) => {
  return (
    <div className="bg-background-elevated/60 border border-border-color rounded-2xl p-8 relative overflow-hidden flex flex-col justify-between h-full group">
      <div className="relative z-10">
        <div className="flex items-center space-x-3 mb-4">
            <img src={icon} alt={`${titlePrefix} icon`} className="h-7 w-7"/>
            <span className="font-semibold text-md text-text-primary tracking-wide">{titlePrefix}</span>
        </div>
        <h3 className="text-4xl font-bold mb-3 leading-tight" dangerouslySetInnerHTML={{ __html: titleMain }}></h3>
        <p className="text-text-secondary mb-8 max-w-sm">{description}</p>
      </div>

      <div className="relative z-10 mt-auto">
         <a href={ctaLink} className="inline-block bg-accent-gold text-background-dark font-bold py-3 px-5 rounded-lg hover:brightness-110 transition-all transform group-hover:scale-105">
            {ctaText} &rarr;
        </a>
      </div>
      
      <img src={image} alt="" className="absolute -right-20 -bottom-16 w-3/4 sm:w-1/2 opacity-20 transform group-hover:opacity-30 group-hover:scale-110 transition-all duration-500 ease-in-out" style={{ filter: 'contrast(1.2)' }} />
    </div>
  );
};
