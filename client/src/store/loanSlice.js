import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api";

export const submitLoan = createAsyncThunk("loan/submit", async (loanData, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/loans", loanData);
    if (!data.success) return rejectWithValue(data.error?.message || "Failed to submit loan");
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || "Failed to submit loan");
  }
});

export const fetchLoans = createAsyncThunk("loan/fetchAll", async (params = {}, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/loans", { params });
    if (!data.success) return rejectWithValue(data.error?.message || "Failed to fetch loans");
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || "Failed to fetch loans");
  }
});

export const updateLoanStatus = createAsyncThunk("loan/updateStatus", async ({ id, ...updateData }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/loans/${id}/status`, updateData);
    if (!data.success) return rejectWithValue(data.error?.message || "Failed to update loan status");
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || "Failed to update loan status");
  }
});

const loanSlice = createSlice({
  name: "loan",
  initialState: {
    list: [],
    pagination: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearLoanError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitLoan.fulfilled, (state, action) => { state.list.unshift(action.payload); })
      .addCase(fetchLoans.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchLoans.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data || [];
        state.pagination = action.payload.pagination || null;
      })
      .addCase(fetchLoans.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(updateLoanStatus.fulfilled, (state, action) => {
        const idx = state.list.findIndex((l) => l._id === action.payload._id);
        if (idx >= 0) state.list[idx] = action.payload;
      });
  },
});

export const { clearLoanError } = loanSlice.actions;
export default loanSlice.reducer;
