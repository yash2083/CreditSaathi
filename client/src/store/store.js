import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import msmeReducer from "./msmeSlice";
import scoreReducer from "./scoreSlice";
import loanReducer from "./loanSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    msme: msmeReducer,
    score: scoreReducer,
    loan: loanReducer,
  },
});

export default store;
