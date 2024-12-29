// components/common/ResultsGrid.jsx
import React from 'react';
import { Grid } from "@shopify/polaris";

export function ResultsGrid({ children }) {
  return (
    <Grid gap="400">
      {React.Children.map(children, (child) => (
        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
          {child}
        </Grid.Cell>
      ))}
    </Grid>
  );
}