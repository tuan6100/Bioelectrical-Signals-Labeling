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
                fontSize: '2.5rem',
                color: '#333',
                fontFamily: 'Open Sans, sans-serif'
            }}>
                Biosignal Labeling Dashboard
            </h1>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    marginTop: '16px'
                }}
            >
                <a
                    href="https://lab.ibme.edu.vn/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'inline-block',
                        cursor: 'pointer'
                    }}
                >
                    <img
                        src={ibmeLogo}
                        alt="iBME Logo"
                        style={{
                            height: '72px',
                            width: 'auto',
                            transition: 'opacity 0.2s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    />
                </a>

                <a
                    href="mailto:huy.lp187172@sis.hust.edu.vn"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'none',
                        color: '#555',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#007bff')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
                >
                    <FontAwesomeIcon icon={faEnvelope} />
                    Contact Us
                </a>
            </div>
        </div>
    );
}
