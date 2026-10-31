import MuiGrid from '@mui/material/Grid';

const BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl'];

/**
 * Compatibility wrapper for MUI v9 Grid.
 *
 * The codebase was written against the MUI v4/v5 Grid API (`<Grid item xs={12} sm={4}>`),
 * but MUI v9 removed `item` and the `xs`/`sm`/... props in favour of a single
 * `size` object. This maps the old props onto the new API so existing layouts
 * keep working, and drops `item` so it is not forwarded to the DOM.
 */
export default function Grid({ xs, sm, md, lg, xl, item, size, ...rest }) {
  const breakpoints = { xs, sm, md, lg, xl };
  const hasBreakpoints = BREAKPOINTS.some((key) => breakpoints[key] !== undefined);

  let resolvedSize = size;
  if (hasBreakpoints) {
    resolvedSize = {};
    for (const key of BREAKPOINTS) {
      if (breakpoints[key] !== undefined) resolvedSize[key] = breakpoints[key];
    }
  }

  return <MuiGrid {...rest} {...(resolvedSize !== undefined ? { size: resolvedSize } : {})} />;
}
