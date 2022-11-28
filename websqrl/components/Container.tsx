import { Box } from "jsxstyle";
import { styleConstants } from "../src/constants";

interface ContainerProps {
  children: React.ReactNode;
}

export const Container: React.FC<ContainerProps> = ({ children }) => (
  <Box
    backgroundColor={styleConstants.insetBackground}
    borderRadius={styleConstants.containerRadius}
    border="1px solid"
    borderColor={styleConstants.containerOutlineColor}
    backgroundClip="padding-box"
    padding="7px 10px"
  >
    {children}
  </Box>
);
