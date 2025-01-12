import { Button, Menu } from '@mantine/core';
import { useCallback, type FC } from 'react';
import { Link } from 'react-router';
import { useProject } from '../../hooks/useProject';
import useTracking from '../../providers/Tracking/useTracking';
import { Hash } from '../../svgs/metricsCatalog';
import { EventName } from '../../types/Events';

interface Props {
    projectUuid: string;
}

const MetricsMenu: FC<Props> = ({ projectUuid }) => {
    const { data: project } = useProject(projectUuid);
    const { track } = useTracking();

    const handleMetricsCatalogClick = useCallback(() => {
        if (project) {
            track({
                name: EventName.METRICS_CATALOG_CLICKED,
                properties: {
                    organizationId: project.organizationUuid,
                    projectId: projectUuid,
                },
            });
        }
    }, [project, projectUuid, track]);

    return (
        <Menu
            withArrow
            withinPortal
            shadow="lg"
            position="bottom-start"
            arrowOffset={16}
            offset={-2}
        >
            <Menu.Target>
                <Button
                    variant="default"
                    size="xs"
                    fz="sm"
                    leftIcon={<Hash />}
                    component={Link}
                    to={`/projects/${projectUuid}/metrics`}
                    onClick={handleMetricsCatalogClick}
                >
                    Metrics
                </Button>
            </Menu.Target>
        </Menu>
    );
};
export default MetricsMenu;
