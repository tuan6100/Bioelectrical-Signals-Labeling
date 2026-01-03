import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope } from "@fortawesome/free-solid-svg-icons";
import ibmeLogo from "../assets/ibme-logo.png";

export default function DashboardHeader() {
    return (
        <div className="dashboard-top-nav" style={{
            padding: '20px 20px 0 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end'
        }}>
            <div style={{ width: '200px' }}></div>

            <h1 style={{
                textAlign: "center",
                margin: 0,
                fontSize: '2rem',
                color: '#333',
                fontFamily: 'Open Sans, sans-serif'
            }}>
                EMG Biosignal Labeling Dashboard
            </h1>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '10px'
            }}>
                <a
                    href="https://lab.ibme.edu.vn/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'block',
                        cursor: 'pointer',
                        textDecoration: 'none'
                    }}
                >
                    <img
                        src={ibmeLogo}
                        alt="iBME Logo"
                        style={{
                            height: '80px',
                            width: 'auto',
                            transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                    />
                </a>

                <a
                    href="mailto:huy.lp187172@sis.hust.edu.vn,"
                    className="contact-link"
                    style={{
                        textDecoration: "none",
                        color: "#007bff",
                        fontWeight: "500",
                        fontSize: "0.9rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                    }}
                >
                    <FontAwesomeIcon icon={faEnvelope} />
                    Contact Us
                </a>
            </div>
        </div>
    );
}
