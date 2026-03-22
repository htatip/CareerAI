import API from "../api/axios";

export const searchJobs = async (resumeId, skill, location, page = 0) => {
  const res = await API.get(`/api/jobs/search/${resumeId}`, {
    params: { skill, location, page },
  });
  return res.data;
};

export const analyzeJob = async (resumeId, jobDescription) => {
  const res = await API.post(`/api/jobs/analyze-job/${resumeId}`, { jobDescription });
  return res.data;
};

export const recommendJobs = async (resumeId, location = "Remote") => {
  const res = await API.post(`/api/jobs/recommend-ai/${resumeId}`, null, {
    params: { location },
  });
  return res.data?.data ?? res.data;
};