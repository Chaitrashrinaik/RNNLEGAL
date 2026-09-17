import { TextField, InputAdornment } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

export default function SearchBar({ value, onChange, placeholder = 'Search...', sx = {} }) {
  return (
    <TextField
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      sx={{
        minWidth: 250,
        '& .MuiOutlinedInput-root': {
          borderRadius: 2,
          backgroundColor: 'rgba(15, 21, 32, 0.5)',
        },
        ...sx,
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
          </InputAdornment>
        ),
      }}
    />
  );
}
