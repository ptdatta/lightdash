import { createStyles } from '@mantine/core';

export const useSelectStyles = createStyles((theme) => ({
    input: {
        fontWeight: 500,
        fontSize: 14,
        height: 32,
        borderColor: theme.colors.gray[2],
        borderRadius: theme.radius.md,
        boxShadow: theme.shadows.subtle,
        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
        color: theme.colors.dark[7],
        '&:hover': {
            backgroundColor: theme.colors.gray[0],
        },
        '&[value=""]': {
            border: `1px dashed ${theme.colors.gray[4]}`,
        },
    },
    item: {
        fontSize: 14,
        '&[data-selected="true"]': {
            color: theme.colors.gray[7],
            fontWeight: 500,
            backgroundColor: theme.colors.gray[0],
        },
        '&[data-selected="true"]:hover': {
            backgroundColor: theme.colors.gray[0],
        },
        '&:hover': {
            backgroundColor: theme.colors.gray[0],
        },
    },
    dropdown: {
        minWidth: 'fit-content',
    },
    rightSection: {
        pointerEvents: 'none',
    },
}));
