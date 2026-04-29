import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBook, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import ibmeLogo from "../assets/ibme-logo.png";

const HeaderLink = ({ icon, text, onClick, href }) => {
    const [isHovered, setIsHovered] = useState(false);

    const style = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        textDecoration: 'none',
        color: isHovered ? '#1890ff' : '#595959',
        fontSize: '14px',
        fontWeight: 500,
        padding: '8px 12px',
        borderRadius: '6px',
        backgroundColor: isHovered ? 'rgba(0,0,0,0.025)' : 'transparent',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
    };

    const content = (
        <>
            <FontAwesomeIcon icon={icon} style={{ fontSize: '14px' }} />
            <span>{text}</span>
        </>
    );

    if (onClick) {
        return (
            <a href="#" onClick={onClick} style={style} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
                {content}
            </a>
        );
    }

    return (
        <a href={href} style={style} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            {content}
        </a>
    );
};

export default function DashboardHeader() {
    const handleOpenDocumentation = (e) => {
        e.preventDefault();
        if (window.biosignalApi?.head?.openDocumentation) {
            window.biosignalApi.head.openDocumentation();
        }
    };

    return (
        <header style={{
            height: '70px',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
            boxShadow: 'none',
            borderBottom: 'none',
            position: 'relative',
            zIndex: 1000,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', zIndex: 2 }}>
                <a
                    href="https://lab.ibme.edu.vn/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
                >
                    <img
                        src={ibmeLogo}
                        alt="iBME Logo"
                        style={{
                            height: '100px',
                            width: 'auto',
                        }}
                    />
                </a>
            </div>

            <h1 style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                margin: 0,
                fontSize: '2rem',
                color: '#333232',
                fontFamily: '"Open Sans", sans-serif',
                whiteSpace: 'nowrap',
                zIndex: 1
            }}>
                Biosignal Labeling Dashboard
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 2 }}>
                <HeaderLink
                    icon={faBook}
                    text="Documentation"
                    onClick={handleOpenDocumentation}
                />

                <HeaderLink
                    icon={faEnvelope}
                    text="Contact Us"
                    href="mailto:huy.lp187172@sis.hust.edu.vn"
                />
            </div>
        </header>
    );
}