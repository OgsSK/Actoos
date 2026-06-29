import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const useAppliedJobs = (userId) => {
  const [appliedJobIds, setAppliedJobIds] = useState([]);

  useEffect(() => {
    if (!userId) {
      setAppliedJobIds([]);
      return;
    }
    supabase
      .from('applications')
      .select('job_id')
      .eq('candidate_id', userId)
      .then(({ data }) => {
        setAppliedJobIds((data || []).map(app => app.job_id));
      });
  }, [userId]);

  return appliedJobIds;
};

export default useAppliedJobs;