import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import styles from './Notification.css'

const hasOnlyButton = hasButton =>
    classNames(styles.buttonTick, {
        [styles.onlyTick]: !hasButton,
    })

const Notification = props => (
    <li>
        <div className={styles.mainNotifContainer}>
            <div className={styles.notifContainer}>
                <div className={styles.content}>
                    <div className={styles.messageWhy}>
                        <div className={styles.titleMessage}>
                            <div className={styles.title}>{props.title}</div>
                            <div className={styles.message}>
                                <p>{props.message}</p>
                            </div>
                            {props.isShowMore && (
                                <div
                                    className={styles.showMore}
                                    onClick={props.showMore}
                                >
                                    Show {props.isMore ? 'More' : 'Less'}
                                </div>
                            )}
                        </div>
                    </div>
                    {(props.isUnread || props.buttonText) && (
                        <div className={hasOnlyButton(props.buttonText)}>
                            <div className={styles.buttonsContainer}>
                                {props.buttons}
                            </div>
                            {props.isUnread && (
                                <div
                                    className={styles.tick}
                                    onClick={props.handleTick}
                                    title="Mark as read"
                                >
                                    Mark as Read
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </li>
)

Notification.propTypes = {
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    buttonText: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.arrayOf(PropTypes.object),
    ]),
    isShowMore: PropTypes.bool.isRequired,
    showMore: PropTypes.func.isRequired,
    isMore: PropTypes.bool.isRequired,
    handleTick: PropTypes.func.isRequired,
    isUnread: PropTypes.bool.isRequired,
    buttons: PropTypes.arrayOf(PropTypes.node),
}

export default Notification
