import {
  ScrollArea,
  Group,
  Button,
  ThemeIcon,
  Menu,
  Box,
  ActionIcon,
  createStyles,
} from '@mantine/core';
import { NextLink } from '@mantine/next';
import {
  IconAlertTriangle,
  IconDotsVertical,
  IconTrash,
  IconEdit,
  IconPhotoEdit,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons';
import { useRouter } from 'next/router';
import { useRef, useState } from 'react';

import { ModelById } from '~/types/router';

const useStyles = createStyles((theme) => ({
  scrollContainer: { position: 'relative' },

  arrowButton: {
    '&:active': {
      transform: 'none',
    },
  },

  hidden: {
    display: 'none !important',
  },

  leftArrow: {
    display: 'none',
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    paddingRight: theme.spacing.xl,
    zIndex: 12,
    backgroundImage: theme.fn.gradient({
      from: theme.colorScheme === 'dark' ? theme.colors.dark[7] : 'white',
      to: 'transparent',
      deg: 90,
    }),

    [theme.fn.largerThan('md')]: {
      display: 'block',
    },
  },
  rightArrow: {
    display: 'none',
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    paddingLeft: theme.spacing.xl,
    zIndex: 12,
    backgroundImage: theme.fn.gradient({
      from: theme.colorScheme === 'dark' ? theme.colors.dark[7] : 'white',
      to: 'transparent',
      deg: 270,
    }),

    [theme.fn.largerThan('md')]: {
      display: 'block',
    },
  },
}));

export function ModelVersionList({
  versions,
  selected,
  showMenu,
  onVersionClick,
  onDeleteClick,
}: Props) {
  const { classes, cx, theme } = useStyles();
  const router = useRouter();

  const viewportRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });

  const largerThanViewport =
    viewportRef.current && viewportRef.current.scrollWidth > viewportRef.current.offsetWidth;
  const atStart = scrollPosition.x === 0;
  const atEnd =
    viewportRef.current &&
    scrollPosition.x >= viewportRef.current.scrollWidth - viewportRef.current.offsetWidth - 1;

  const scrollLeft = () => viewportRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
  const scrollRight = () => viewportRef.current?.scrollBy({ left: 200, behavior: 'smooth' });

  return (
    <ScrollArea
      className={classes.scrollContainer}
      viewportRef={viewportRef}
      onScrollPositionChange={setScrollPosition}
      type="never"
    >
      <Box className={cx(classes.leftArrow, atStart && classes.hidden)}>
        <ActionIcon
          className={classes.arrowButton}
          variant="transparent"
          radius="xl"
          onClick={scrollLeft}
        >
          <IconChevronLeft />
        </ActionIcon>
      </Box>
      <Group spacing={4} noWrap>
        {versions.map((version) => {
          const active = selected === version.id;
          const missingFiles = !version.files.length;
          const missingPosts = !version.posts.length;

          return (
            <Button
              key={version.id}
              variant={active ? 'filled' : theme.colorScheme === 'dark' ? 'filled' : 'light'}
              color={active ? 'blue' : 'gray'}
              onClick={() => {
                if (missingFiles)
                  return router.push(
                    `/models/v2/${version.modelId}/model-versions/${version.id}/wizard?step=2`
                  );
                if (missingPosts)
                  return router.push(
                    `/models/v2/${version.modelId}/model-versions/${version.id}/wizard?step=3`
                  );

                return onVersionClick(version);
              }}
              leftIcon={
                missingFiles || missingPosts ? (
                  <ThemeIcon
                    color="yellow"
                    variant="light"
                    radius="xl"
                    size="sm"
                    sx={{ backgroundColor: 'transparent' }}
                  >
                    <IconAlertTriangle size={14} />
                  </ThemeIcon>
                ) : undefined
              }
              rightIcon={
                showMenu ? (
                  <Menu withinPortal>
                    <Menu.Target>
                      <Box
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                      >
                        <IconDotsVertical size={14} />
                      </Box>
                    </Menu.Target>
                    <Menu.Dropdown>
                      {versions.length > 1 && (
                        <Menu.Item
                          color="red"
                          icon={<IconTrash size={14} stroke={1.5} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onDeleteClick(version.id);
                          }}
                        >
                          Delete version
                        </Menu.Item>
                      )}
                      <Menu.Item
                        component={NextLink}
                        icon={<IconEdit size={14} stroke={1.5} />}
                        onClick={(e) => e.stopPropagation()}
                        href={`/models/v2/${version.modelId}/model-versions/${version.id}/edit`}
                      >
                        Edit version
                      </Menu.Item>
                      <Menu.Item
                        icon={<IconPhotoEdit size={14} stroke={1.5} />}
                        // TODO.manuel: add carousel edit
                        onClick={(e) => e.stopPropagation()}
                      >
                        Edit carousel
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                ) : undefined
              }
              compact
            >
              {version.name}
            </Button>
          );
        })}
      </Group>
      <Box className={cx(classes.rightArrow, (atEnd || !largerThanViewport) && classes.hidden)}>
        <ActionIcon
          className={classes.arrowButton}
          variant="transparent"
          radius="xl"
          onClick={scrollRight}
        >
          <IconChevronRight />
        </ActionIcon>
      </Box>
    </ScrollArea>
  );
}

type Props = {
  versions: ModelById['modelVersions'];
  onVersionClick: (version: ModelById['modelVersions'][number]) => void;
  onDeleteClick: (versionId: number) => void;
  selected?: number;
  showMenu?: boolean;
};