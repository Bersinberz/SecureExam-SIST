import React from 'react';

const styles = {
    footer: {
        position: 'fixed' as 'fixed',
        bottom: 0,
        width: '100%',
        backgroundColor: '#831238',
        padding: '5px 0',
        overflow: 'hidden' as 'hidden',
        textAlign: 'center' as 'center',
        color: 'white',
        minHeight: '30px',
    },
    newsText: {
        whiteSpace: 'nowrap' as 'nowrap',
        fontSize: '14px',
        backgroundColor: '#F4F4F4',
        color: 'black',
        padding: '5px',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        margin: '0 auto',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    scrollingText: {
        display: 'flex',
        whiteSpace: 'nowrap' as 'nowrap',
        position: 'relative' as 'relative',
        animation: 'scrollText 40s linear infinite',
    },
};

const Footer: React.FC = () => {
    return (
        <footer style={styles.footer}>
            <div style={styles.newsText}>
                <div style={styles.scrollingText}>
                    © Developed by AIML students | SCAS - Sathyabama Institute Of Science and Technology
                </div>
            </div>

            <style>{`
                @keyframes scrollText {
                    from { transform: translateX(237%); }
                    to { transform: translateX(-235%); }
                }
            `}</style>
        </footer>
    );
};

export default Footer;
