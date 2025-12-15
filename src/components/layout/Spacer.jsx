import { splitProps } from 'solid-js';

/**
 * Flex spacer - expands to fill available space
 *
 * @example
 * <Row>
 *   <Logo />
 *   <Spacer />
 *   <UserMenu />
 * </Row>
 */
export function Spacer(props) {
    const [local, others] = splitProps(props, ['class', 'size']);

    const style = () => {
        if (local.size) {
            return { width: local.size, height: local.size, 'flex-shrink': 0 };
        }
        return { flex: 1 };
    };

    return (
        <div
            class={local.class || ''}
            style={style()}
            {...others}
        />
    );
}

export default Spacer;
