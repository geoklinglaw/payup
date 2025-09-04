import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  colors: {
    button: {
      500: "#0d6ffd",
      600: "#b4dbff",
    },
    selection: {
      500: "#eaf2ff",
    },
  },
});

export default theme;
