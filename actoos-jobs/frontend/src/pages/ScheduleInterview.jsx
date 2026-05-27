import React from 'react';

const ScheduleInterview = () => {
  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Planifier un entretien</h1>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ height: '700px' }}>
          <iframe
            src="https://calendly.com/actoos/entretien"
            width="100%"
            height="100%"
            frameBorder="0"
            title="Calendly"
          />
        </div>
      </div>
    </div>
  );
};

export default ScheduleInterview;