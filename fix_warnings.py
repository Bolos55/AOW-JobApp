#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Fix EmployerView.jsx warnings
with open('src/EmployerView.jsx', 'r', encoding='utf-8-sig') as f:
    content = f.read()

# Fix the malformed eslint comment
content = content.replace(
    '    // eslint-disable-next-line react-hooks/exhaustive-deps`n  }, [open, app]);',
    '    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [open, app]);'
)

# Also try to fix if it's still the original
if '  }, [open, app]);' in content and '// eslint-disable-next-line react-hooks/exhaustive-deps' not in content.split('  }, [open, app]);')[0].split('\n')[-5:]:
    content = content.replace(
        '  }, [open, app]);',
        '    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [open, app]);',
        1  # Only replace first occurrence
    )

# Write back without BOM
with open('src/EmployerView.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Fixed warnings in EmployerView.jsx")
