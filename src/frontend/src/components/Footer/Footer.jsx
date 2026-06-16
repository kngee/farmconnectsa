import './Footer.css';

function Footer() {
  const teamMembers = {
    leader: [
      {
        name: 'Kiran Soodyall',
        role: 'Project Lead',
        email: 'kiransoodyall03@gmail.com',
      },
    ],
    members: [
      {
        name: 'Kenna Geleta',
        role: 'Team Member',
      },
      {
        name: 'Abdul Gani',
        role: 'Team Member',
      },
    ],
  };

  return (
    <footer className="footer">
      <div className="footer__content">
        <p className="footer__text">
          © {new Date().getFullYear()} FarmConnectSA &nbsp;·&nbsp;
          University of the Witwatersrand &nbsp;·&nbsp;
          Team Leader: {teamMembers.leader[0].name}
        </p>
        
        <div className="footer__team">
          <div className="footer__team-section">
            <h4>Leadership</h4>
            <ul>
              {teamMembers.leader.map((member, index) => (
                <li key={index}>
                  <strong>{member.name}</strong>
                  {member.email && <a href={`mailto:${member.email}`}>{member.email}</a>}
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__team-section">
            <h4>Team Members</h4>
            <ul>
              {teamMembers.members.map((member, index) => (
                <li key={index}>
                  <strong>{member.name}</strong>
                  <span className="role">{member.role}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;