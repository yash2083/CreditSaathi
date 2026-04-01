import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api";

export const generateScore = createAsyncThunk("score/generate", async (msmeId, { rejectWithValue }) => {
  try {
    const { data } = await api.post(`/scoring/generate/${msmeId}`);
    if (!data.success) return rejectWithValue(data.error?.message || "Failed to generate score");
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || "Failed to generate score");
  }
});

export const fetchLatestScore = createAsyncThunk("score/fetchLatest", async (msmeId, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/scoring/${msmeId}/latest`);
    if (!data.success) return rejectWithValue(data.error?.message || "No score found");
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || "No score found");
  }
});

export const fetchScoreHistory = createAsyncThunk("score/fetchHistory", async (msmeId, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/scoring/${msmeId}/history`);
    if (!data.success) return rejectWithValue(data.error?.message || "Failed to fetch score history");
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || "Failed to fetch score history");
  }
});

const scoreSlice = createSlice({
  name: "score",
  initialState: {
    latest: null,
    history: [],
    loading: false,
    generating: false,
    error: null,
  },
  reducers: {
    clearScoreError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateScore.pending, (state) => { state.generating = true; state.error = null; })
      .addCase(generateScore.fulfilled, (state, action) => {
        state.generating = false;
        state.latest = action.payload;
        state.history.unshift(action.payload);
      })
      .addCase(generateScore.rejected, (state, action) => { state.generating = false; state.error = action.payload; })
      .addCase(fetchLatestScore.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchLatestScore.fulfilled, (state, action) => { state.loading = false; state.latest = action.payload; })
      .addCase(fetchLatestScore.rejected, (state, action) => { state.loading = false; state.latest = null; state.error = action.payload; })
      .addCase(fetchScoreHistory.fulfilled, (state, action) => { state.history = action.payload || []; })
      .addCase(fetchScoreHistory.rejected, (state) => { state.history = []; });
  },
});

export const { clearScoreError } = scoreSlice.actions;
export default scoreSlice.reducer;
