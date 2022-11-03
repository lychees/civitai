import { Carousel } from '@mantine/carousel';
import {
  ActionIcon,
  AspectRatio,
  Badge,
  Button,
  Center,
  Container,
  CopyButton,
  createStyles,
  Grid,
  Group,
  Loader,
  Menu,
  MultiSelect,
  Select,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { closeAllModals, openConfirmModal, openContextModal } from '@mantine/modals';
import { NextLink } from '@mantine/next';
import { showNotification } from '@mantine/notifications';
import {
  IconArrowsSort,
  IconCheck,
  IconCopy,
  IconDotsVertical,
  IconEdit,
  IconFilter,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons';
import { createProxySSGHelpers } from '@trpc/react-query/ssg';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useState } from 'react';
import superjson from 'superjson';
import { NotFound } from '~/components/AppLayout/NotFound';
import { ContentClamp } from '~/components/ContentClamp/ContentClamp';
import {
  DescriptionTable,
  type Props as DescriptionTableProps,
} from '~/components/DescriptionTable/DescriptionTable';
import { Meta } from '~/components/Meta/Meta';
import LightboxCarousel from '~/components/LightboxImageCarousel/LightboxImageCarousel';
import { ModelForm } from '~/components/Model/ModelForm/ModelForm';
import { ModelReviews } from '~/components/Model/ModelReviews/ModelReviews';
import { ModelVersions } from '~/components/Model/ModelVersions/ModelVersions';
import { ModelRating } from '~/components/ModelRating/ModelRating';
import { UserAvatar } from '~/components/UserAvatar/UserAvatar';
import { useIsMobile } from '~/hooks/useIsMobile';
import { ReviewFilter, ReviewSort } from '~/server/common/enums';
import { createContextInner } from '~/server/trpc/context';
import { appRouter } from '~/server/trpc/router';
import { formatDate } from '~/utils/date-helpers';
import { formatBytes } from '~/utils/number-helpers';
import { splitUppercase } from '~/utils/string-helpers';
import { trpc } from '~/utils/trpc';
import { useImageLightbox } from '~/hooks/useImageLightbox';

export const getServerSideProps: GetServerSideProps<{ id: number }> = async (context) => {
  const ssg = createProxySSGHelpers({
    router: appRouter,
    ctx: await createContextInner({ session: null }),
    transformer: superjson,
  });
  const id = Number(context.params?.id as string);
  await ssg.model.getById.prefetch({ id });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      id,
    },
  };
};

const useStyles = createStyles((theme) => ({
  actions: {
    [theme.fn.smallerThan('sm')]: {
      width: '100%',
    },
  },

  title: {
    [theme.fn.smallerThan('sm')]: {
      fontSize: theme.fontSizes.xs * 2.4, // 24px
    },
  },
}));

export default function ModelDetail(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const theme = useMantineTheme();
  const router = useRouter();
  const { data: session } = useSession();
  const { classes } = useStyles();
  const mobile = useIsMobile();
  const { openImageLightbox } = useImageLightbox();

  const { id } = props;
  const { edit } = router.query;

  const [reviewFilters, setReviewFilters] = useState<{
    filterBy: ReviewFilter[];
    sort: ReviewSort;
  }>({
    filterBy: [],
    sort: ReviewSort.Newest,
  });

  const { data: model, status: modelStatus } = trpc.model.getById.useQuery({ id });
  const { data: reviews = [], status: reviewsStatus } = trpc.review.getAll.useQuery({
    modelId: id,
    ...reviewFilters,
  });

  const deleteMutation = trpc.model.delete.useMutation();

  if (modelStatus === 'loading')
    return (
      <Container size="xl">
        <Center>
          <Loader size="xl" />
        </Center>
      </Container>
    );
  if (!model) return <NotFound />;
  if (!!edit && model) return <ModelForm model={model} />;

  const handleDeleteModel = () => {
    openConfirmModal({
      title: 'Delete Model',
      children: (
        <Text size="sm">
          Are you sure you want to delete this model? This action is destructive and you will have
          to contact support to restore your data.
        </Text>
      ),
      centered: true,
      labels: { confirm: 'Delete Model', cancel: "No, don't delete it" },
      confirmProps: { color: 'red', loading: deleteMutation.isLoading },
      closeOnConfirm: false,
      onConfirm: () => {
        if (model) {
          deleteMutation.mutate(
            { id: model.id },
            {
              onSuccess() {
                showNotification({
                  title: 'Your model has been deleted',
                  message: 'Successfully deleted the model',
                  color: 'teal',
                  icon: <IconCheck size={18} />,
                });
                closeAllModals();
                router.replace('/'); // Redirect to the models or user page once available
              },
              onError(error) {
                const message = error.message;

                showNotification({
                  title: 'Could not delete model',
                  message: `An error occurred while deleting the model: ${message}`,
                  color: 'red',
                  icon: <IconX size={18} />,
                });
              },
            }
          );
        }
      },
    });
  };

  const handleReviewFilterChange = (values: ReviewFilter[]) => {
    setReviewFilters((current) => ({
      ...current,
      filterBy: values,
    }));
  };

  const handleReviewSortChange = (value: ReviewSort) => {
    setReviewFilters((current) => ({
      ...current,
      sort: value,
    }));
  };

  const modelDetails: DescriptionTableProps['items'] = [
    {
      label: 'Type',
      value: <Badge radius="sm">{splitUppercase(model?.type)}</Badge>,
    },
    {
      label: 'Downloads',
      value: <Text>{model?.rank?.downloadCountAllTime.toLocaleString() ?? 0}</Text>,
    },
    {
      label: 'Last Update',
      value: <Text>{formatDate(model?.updatedAt)}</Text>,
    },
    {
      label: 'Versions',
      value: <Text>{model?.modelVersions.length}</Text>,
    },
    {
      label: 'Tags',
      value: (
        <Group spacing={4}>
          {model.tagsOnModels.map(({ tag }) => (
            <Badge key={tag.id} color={tag.color ?? 'blue'} size="sm">
              {tag.name}
            </Badge>
          ))}
        </Group>
      ),
    },
    {
      label: 'Trained Words',
      value: (
        <Group spacing={4}>
          {model?.trainedWords.map((word, index) => (
            <CopyButton key={index} value={word}>
              {({ copy }) => (
                <Badge
                  size="sm"
                  color="violet"
                  sx={{ cursor: 'pointer' }}
                  onClick={() => {
                    copy();
                    showNotification({ message: 'Copied trained word!', color: 'teal' });
                  }}
                >
                  <Group spacing={4} align="center">
                    {word}
                    <IconCopy stroke={1.5} size={12} />
                  </Group>
                </Badge>
              )}
            </CopyButton>
          ))}
        </Group>
      ),
    },
    {
      label: 'Uploaded By',
      value: model.user ? (
        <UserAvatar user={model.user} avatarProps={{ size: 'sm' }} withUsername />
      ) : null,
    },
  ];

  const latestVersion = model?.modelVersions[model.modelVersions.length - 1];

  return (
    <>
      <Meta
        title={`Model Share - ${model.name}`}
        description={model.description ?? ''}
        image={latestVersion.images[0].image.url}
      />

      <Container size="xl" py="xl">
        <Stack spacing="xs" mb="xl">
          <Group align="center" sx={{ justifyContent: 'space-between' }}>
            <Title className={classes.title} order={1}>
              {model?.name}
            </Title>
            {session && session.user?.id === model?.user.id ? (
              <Menu position="bottom-end" transition="pop-top-right">
                <Menu.Target>
                  <ActionIcon variant="outline">
                    <IconDotsVertical size={16} />
                  </ActionIcon>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Item
                    component={NextLink}
                    href={`/models/${id}?edit=true`}
                    icon={<IconEdit size={14} stroke={1.5} />}
                    shallow
                  >
                    Edit Model
                  </Menu.Item>
                  <Menu.Item
                    color={theme.colors.red[6]}
                    icon={<IconTrash size={14} stroke={1.5} />}
                    onClick={handleDeleteModel}
                  >
                    Delete Model
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ) : null}
          </Group>
          <ModelRating rank={model.rank} />
        </Stack>
        <Grid gutter="xl">
          <Grid.Col xs={12} sm={5} md={4} orderSm={2}>
            <Stack>
              <Button
                component="a"
                href={`/api/download/models/${latestVersion?.id}`}
                target="_blank"
                fullWidth={mobile}
                sx={{ height: 'auto' }}
                py={4}
                download
              >
                <Text align="center">
                  {`Download (${formatBytes(latestVersion?.sizeKB ?? 0)})`}
                  <Text size="xs">{`${latestVersion.name} (${formatDate(
                    latestVersion.createdAt
                  )})`}</Text>
                </Text>
              </Button>
              <DescriptionTable items={modelDetails} labelWidth="30%" />
            </Stack>
          </Grid.Col>
          <Grid.Col
            xs={12}
            sm={7}
            md={8}
            orderSm={1}
            sx={(theme) => ({
              [theme.fn.largerThan('xs')]: {
                // borderRight: `1px ${
                //   theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]
                // } solid`,
                padding: `0 ${theme.spacing.sm}px`,
                margin: `${theme.spacing.sm}px 0`,
              },
            })}
          >
            <Stack>
              <Carousel
                slideSize="50%"
                breakpoints={[{ maxWidth: 'sm', slideSize: '100%', slideGap: 2 }]}
                slideGap="xl"
                align={latestVersion.images.length > 2 ? 'start' : 'center'}
                slidesToScroll={mobile ? 1 : 2}
                withControls={latestVersion.images.length > 2 ? true : false}
              >
                {latestVersion.images.map(({ image }, index) => (
                  <Carousel.Slide key={image.id}>
                    <AspectRatio ratio={1}>
                      <Image
                        src={image.url}
                        alt={image.name ?? 'Example results of the model'}
                        layout="fill"
                        objectFit="cover"
                        objectPosition="top"
                        style={{ borderRadius: theme.spacing.md }}
                        onClick={() =>
                          openImageLightbox({
                            initialSlide: index,
                            images: latestVersion.images.map(({ image }) => image),
                          })
                        }
                      />
                    </AspectRatio>
                  </Carousel.Slide>
                ))}
              </Carousel>
              {/* <Title className={classes.title} order={2}>
              About this model
            </Title> */}
              <ContentClamp maxHeight={150}>
                <Text>{model?.description}</Text>
              </ContentClamp>
            </Stack>
          </Grid.Col>
          <Grid.Col span={12} orderSm={3} my="xl">
            <Stack spacing="xl">
              <Title className={classes.title} order={2}>
                Versions
              </Title>
              <ModelVersions items={model.modelVersions} initialTab={latestVersion.id.toString()} />
            </Stack>
          </Grid.Col>
          <Grid.Col span={12} orderSm={4} my="xl">
            <Stack spacing="xl">
              <Group sx={{ justifyContent: 'space-between' }}>
                <Stack spacing={4}>
                  <Group spacing={4}>
                    <Title order={3}>Reviews</Title>
                    <ModelRating rank={model.rank} />
                  </Group>
                  <Text
                    size="md"
                    color="dimmed"
                  >{`${reviews.length.toLocaleString()} total reviews`}</Text>
                </Stack>
                <Stack align="flex-end" spacing="xs">
                  <Button
                    leftIcon={<IconPlus size={16} />}
                    variant="outline"
                    fullWidth={mobile}
                    size="xs"
                    onClick={() =>
                      openContextModal({
                        modal: 'reviewEdit',
                        title: `Reviewing ${model.name}`,
                        closeOnClickOutside: false,
                        innerProps: {
                          modelVersions: model.modelVersions.map(({ id, name }) => ({ id, name })),
                          review: {
                            modelId: model.id,
                            modelVersionId:
                              model.modelVersions.length === 1
                                ? model.modelVersions[0].id
                                : undefined,
                          },
                        },
                      })
                    }
                  >
                    Add Review
                  </Button>
                  <Group spacing="xs" noWrap grow>
                    <Select
                      defaultValue={ReviewSort.Newest}
                      icon={<IconArrowsSort size={14} />}
                      data={[
                        { label: 'Newest', value: ReviewSort.Newest },
                        { label: 'Most Liked', value: ReviewSort.MostLiked },
                        { label: 'Most Disiked', value: ReviewSort.MostDisliked },
                      ]}
                      onChange={handleReviewSortChange}
                      size="xs"
                    />
                    <MultiSelect
                      placeholder="Filters"
                      icon={<IconFilter size={14} />}
                      data={[
                        { label: 'NSFW', value: ReviewFilter.NSFW },
                        { label: 'Includes Images', value: ReviewFilter.IncludesImages },
                      ]}
                      onChange={handleReviewFilterChange}
                      size="xs"
                      zIndex={500}
                      clearButtonLabel="Clear review filters"
                      clearable
                    />
                  </Group>
                </Stack>
              </Group>
              <ModelReviews
                items={reviews}
                onFilterChange={handleReviewFilterChange}
                loading={['loading', 'fetching'].includes(reviewsStatus)}
              />
            </Stack>
          </Grid.Col>
        </Grid>
      </Container>
    </>
  );
}