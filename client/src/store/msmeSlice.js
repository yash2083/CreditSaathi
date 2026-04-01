import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api";

export const fetchMSMEs = createAsyncThunk("msme/fetchAll", async (params = {}, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/msmes", { params });
    if (!data.success) return rejectWithValue(data.error?.message || "Failed to fetch MSMEs");
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || "Failed to fetch MSMEs");
  }
});

export const fetchMSME = createAsyncThunk("msme/fetchOne", async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/msmes/${id}`);
    if (!data.success) return rejectWithValue(data.error?.message || "Failed to fetch MSME");
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || "Failed to fetch MSME");
  }
});

export const createMSME = createAsyncThunk("msme/create", async (msmeData, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/msmes", msmeData);
    if (!data.success) return rejectWithValue(data.error?.message || "Failed to create MSME");
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || "Failed to create MSME");
  }
});

export const uploadGSTData = createAsyncThunk("msme/uploadGST", async ({ msmeId, records }, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/gst/upload", { msmeId, records });
    if (!data.success) return rejectWithValue(data.error?.message || "Failed to upload GST data");
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || "Failed to upload GST data");
  }
});

export const uploadTransactionData = createAsyncThunk("msme/uploadTransactions", async ({ msmeId, records }, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/transactions/upload", { msmeId, records });
    if (!data.success) return rejectWithValue(data.error?.message || "Failed to upload transaction data");
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || "Failed to upload transaction data");
  }
});

export const fetchGSTRecords = createAsyncThunk("msme/fetchGST", async (msmeId, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/gst/${msmeId}`);
    if (!data.success) return rejectWithValue(data.error?.message || "Failed to fetch GST records");
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || "Failed to fetch GST records");
  }
});

export const fetchTransactionRecords = createAsyncThunk("msme/fetchTransactions", async (msmeId, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/transactions/${msmeId}`);
    if (!data.success) return rejectWithValue(data.error?.message || "Failed to fetch transaction records");
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || "Failed to fetch transaction records");
  }
});

const msmeSlice = createSlice({
  name: "msme",
  initialState: {
    list: [],
    current: null,
    gstRecords: [],
    transactionRecords: [],
    pagination: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearMSMEError: (state) => { state.error = null; },
    setCurrent: (state, action) => { state.current = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMSMEs.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchMSMEs.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data || [];
        state.pagination = action.payload.pagination || null;
      })
      .addCase(fetchMSMEs.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchMSME.fulfilled, (state, action) => { state.current = action.payload; })
      .addCase(createMSME.fulfilled, (state, action) => { state.list.push(action.payload); state.current = action.payload; })
      .addCase(fetchGSTRecords.fulfilled, (state, action) => { state.gstRecords = action.payload || []; })
      .addCase(fetchGSTRecords.rejected, (state) => { state.gstRecords = []; })
      .addCase(fetchTransactionRecords.fulfilled, (state, action) => { state.transactionRecords = action.payload || []; })
      .addCase(fetchTransactionRecords.rejected, (state) => { state.transactionRecords = []; });
  },
});

export const { clearMSMEError, setCurrent } = msmeSlice.actions;
export default msmeSlice.reducer;
