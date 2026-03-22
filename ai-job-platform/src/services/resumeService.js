import API from "../api/axios";

export const uploadResume = async (file) => {
  const form = new FormData();
  form.append("file", file);
  const res = await API.post("/api/resume/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
};


export const getMyResumes = async (page = 0, size = 10) => {
  const res = await API.get("/api/resume/my-resumes", { params: { page, size } });
  return res.data.data; 
};

export const getSkills = async (resumeId) => {
  const res = await API.get(`/api/resume/skills/${resumeId}`);
  return res.data.data;
};

export const analyzeResume = async (resumeId) => {
  const res = await API.post(`/api/resume/analyze/${resumeId}`);
  return res.data.data;
};

export const improveResume = async (resumeId) => {
  const res = await API.post(`/api/resume/improve/${resumeId}`);
  return res.data.data;
};


export const deleteResume = async (resumeId) => {
  const res = await API.delete(`/api/resume/${resumeId}`);
  return res.data;
};


export const downloadResume = async (resumeId, fileName) => {
  const res = await API.get(`/api/resume/${resumeId}/download`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName || `resume-${resumeId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};