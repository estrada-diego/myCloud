// src/theme/index.js
import { createTheme } from "@mui/material/styles";

let baseTheme = createTheme();
const { augmentColor } = baseTheme.palette;

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#9c27b0",
    },
    gray: augmentColor({ color: { main: "#818589" } }),
    // You can keep adding custom colors
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', sans-serif",
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
  },
});

export default theme;
