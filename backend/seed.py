"""Clear and deterministically reseed the local development database."""

from datetime import date, datetime, time

from sqlalchemy import func, select

from app.database import Base, SessionLocal, engine, initialize_database
from app.models import Change, Equipment, Event, Risk, Session, Speaker, Task, Venue, Volunteer

EVENT_ID = "event_kbc_techfest_2026"
EVENT_DATE = date(2026, 11, 15)

VENUE_ROWS = [
    ("venue_auditorium_a", "Auditorium A", "Main Block, ground floor", 900, "confirmed"),
    ("venue_auditorium_b", "Auditorium B", "Main Block, first floor", 520, "confirmed"),
    ("venue_workshop_hall", "Workshop Hall", "Innovation Block, east wing", 180, "confirmed"),
    ("venue_seminar_1", "Seminar Room 1", "Academic Block, level 2", 120, "confirmed"),
    ("venue_seminar_2", "Seminar Room 2", "Academic Block, level 2", 100, "confirmed"),
    ("venue_innovation_lab", "Innovation Lab", "Innovation Block, level 1", 80, "confirmed"),
    ("venue_demo_pavilion", "Demo Pavilion", "Central Courtyard", 250, "setup"),
]

SPEAKER_ROWS = [
    ("speaker_01", "Dr. Ananya Rao", "IISc Bengaluru", "ananya.rao@example.org", "AI Research Lead"),
    ("speaker_02", "Rohan Mehta", "Google Research India", "rohan.mehta@example.org", "Senior Research Engineer"),
    ("speaker_03", "Farah Khan", "CERT-In", "farah.khan@example.org", "Cybersecurity Director"),
    ("speaker_04", "Nikhil Desai", "Peak XV Partners", "nikhil.desai@example.org", "Principal"),
    ("speaker_05", "Dr. Kavya Menon", "IIIT Hyderabad", "kavya.menon@example.org", "Associate Professor"),
    ("speaker_06", "Arjun Iyer", "Atlassian", "arjun.iyer@example.org", "Product Design Lead"),
    ("speaker_07", "Meera Kulkarni", "NVIDIA India", "meera.kulkarni@example.org", "Developer Relations Lead"),
]

VOLUNTEER_ROWS = [
    ("Aarav Shah", "Stage operations"), ("Diya Nair", "Speaker support"),
    ("Kabir Joshi", "Registration"), ("Myra Sen", "Workshop support"),
    ("Ishaan Patel", "Audio visual"), ("Sara Thomas", "Crowd management"),
    ("Vivaan Rao", "Room coordination"), ("Aanya Kapoor", "Speaker support"),
    ("Reyansh Gupta", "Registration"), ("Anika Bose", "Workshop support"),
    ("Advik Reddy", "Audio visual"), ("Kiara Fernandes", "First aid"),
    ("Arnav Malhotra", "Room coordination"), ("Saanvi Pillai", "Registration"),
    ("Atharv Kulkarni", "Stage operations"), ("Ira Chatterjee", "Speaker support"),
    ("Dhruv Bhat", "Workshop support"), ("Navya Krishnan", "Crowd management"),
    ("Yuvaan Sethi", "Audio visual"), ("Riya Mukherjee", "Registration"),
    ("Krish Venkatesh", "Room coordination"), ("Tara D'Souza", "First aid"),
]

EQUIPMENT_ROWS = [
    ("equipment_01", "Laser projector A", "Projection", 1, "venue_auditorium_a", "tested"),
    ("equipment_02", "Wireless microphone kit A", "Audio", 4, "venue_auditorium_a", "tested"),
    ("equipment_03", "Main speaker system", "Audio", 1, "venue_auditorium_a", "tested"),
    ("equipment_04", "Laser projector B", "Projection", 1, "venue_auditorium_b", "available"),
    ("equipment_05", "Wireless microphone kit B", "Audio", 3, "venue_auditorium_b", "available"),
    ("equipment_06", "Workshop laptops", "Computing", 24, "venue_workshop_hall", "reserved"),
    ("equipment_07", "Portable projector", "Projection", 1, "venue_workshop_hall", "tested"),
    ("equipment_08", "Seminar room display 1", "Display", 1, "venue_seminar_1", "tested"),
    ("equipment_09", "Seminar room display 2", "Display", 1, "venue_seminar_2", "tested"),
    ("equipment_10", "GPU workstations", "Computing", 16, "venue_innovation_lab", "reserved"),
    ("equipment_11", "Demo camera kit", "Video", 3, "venue_demo_pavilion", "available"),
    ("equipment_12", "LED stage lighting kit", "Lighting", 2, "venue_auditorium_a", "tested"),
    ("equipment_13", "Extension board set", "Power", 12, None, "available"),
]

SESSION_ROWS = [
    ("session_01", "Opening Ceremony", "venue_auditorium_a", (9, 0), (9, 40), ["speaker_01"], [0, 1, 2], ["equipment_01", "equipment_02", "equipment_03"], "Welcome, event briefing, and opening address."),
    ("session_02", "AI & Future of Computing", "venue_auditorium_a", (10, 0), (11, 0), ["speaker_01", "speaker_02"], [0, 1, 4, 5], ["equipment_01", "equipment_02", "equipment_03"], "A research-led look at responsible AI and next-generation computing."),
    ("session_03", "Competitive Programming Workshop", "venue_workshop_hall", (10, 0), (12, 0), ["speaker_05"], [3, 6, 9, 16], ["equipment_06", "equipment_07"], "Hands-on algorithm challenges for mixed-experience teams."),
    ("session_04", "Cybersecurity: Building Trust at Scale", "venue_seminar_1", (11, 15), (12, 15), ["speaker_03"], [7, 10, 11], ["equipment_08"], "Threat modeling and practical security operations for modern products."),
    ("session_05", "Startup Pitch Showcase", "venue_auditorium_b", (13, 0), (14, 30), ["speaker_04"], [2, 8, 12, 13], ["equipment_04", "equipment_05"], "Student teams pitch products to a panel of early-stage investors."),
    ("session_06", "Machine Learning in Practice", "venue_innovation_lab", (13, 0), (15, 0), ["speaker_05", "speaker_07"], [3, 9, 16, 20], ["equipment_10"], "Model evaluation and deployment exercises using local GPU workstations."),
    ("session_07", "Product Design for Developers", "venue_seminar_2", (14, 0), (15, 0), ["speaker_06"], [6, 13, 15], ["equipment_09"], "A practical discussion about accessible, usable developer tools."),
    ("session_08", "Cloud Security Panel", "venue_auditorium_b", (14, 45), (15, 45), ["speaker_03", "speaker_07"], [5, 7, 10, 17], ["equipment_04", "equipment_05"], "A panel on cloud identity, incident response, and secure infrastructure."),
    ("session_09", "Robotics Demo and Open Lab", "venue_demo_pavilion", (15, 15), (16, 15), ["speaker_07"], [11, 14, 18, 21], ["equipment_11", "equipment_13"], "Live student robotics demonstrations with supervised visitor access."),
    ("session_10", "Career Paths in Technology", "venue_seminar_1", (15, 0), (16, 0), ["speaker_02", "speaker_06"], [1, 12, 15, 19], ["equipment_08"], "Early-career advice and questions with experienced technology teams."),
    ("session_11", "Closing Ceremony", "venue_auditorium_a", (16, 30), (17, 0), ["speaker_01"], [0, 2, 14, 19], ["equipment_01", "equipment_02", "equipment_03", "equipment_12"], "Awards, acknowledgements, and event close."),
]

TASK_ROWS = [
    ("Test Auditorium A projector", "Run the presentation test with the keynote deck.", "high", 5, 2),
    ("Confirm keynote slide deck", "Collect and load the final opening and keynote decks.", "high", 1, 1),
    ("Brief Auditorium A ushers", "Review accessible seating and audience entry plan.", "medium", 5, 1),
    ("Prepare workshop laptops", "Check logins, power, and programming environment on all laptops.", "high", 3, 3),
    ("Inform AI workshop speakers", "Share arrival time, green room location, and session format.", "medium", 7, 2),
    ("Test Seminar Room 1 display", "Verify HDMI connection and backup adapter.", "medium", 10, 4),
    ("Print startup pitch order", "Post the confirmed pitch order backstage and at registration.", "medium", 8, 5),
    ("Reassign registration volunteers", "Move one registration volunteer to the afternoon pitch queue.", "high", 13, 5),
    ("Stage GPU workstations", "Install workshop images and confirm lab network access.", "high", 16, 6),
    ("Check Seminar Room 2 accessibility", "Confirm aisle clearance and reserved seating signs.", "medium", 6, 7),
    ("Move microphones to Auditorium B", "Place and test the wireless microphone kit before the pitch showcase.", "high", 10, 5),
    ("Update event signage", "Add directional signs from the main entrance to the Demo Pavilion.", "medium", 17, 9),
    ("Confirm demo pavilion power", "Check power distribution and tape down cable runs.", "high", 18, 9),
    ("Prepare speaker green room", "Set out water, badges, and the afternoon speaker schedule.", "low", 15, 8),
    ("Check first-aid station", "Confirm first-aid supplies and radio contact at the pavilion.", "high", 11, 9),
    ("Rehearse closing ceremony", "Run the awards handoff and final stage cues.", "medium", 14, 11),
    ("Collect post-event equipment", "Prepare an inventory checklist for the auditorium close.", "low", 20, 11),
]

RISK_ROWS = [
    ("risk_01", "Auditorium A nearing capacity", "Opening and keynote attendance may exceed the reserved seating plan.", "high", "open", "venue_auditorium_a", "session_02"),
    ("risk_02", "Workshop laptop setup window is tight", "Twenty-four workshop laptops need image and login checks before doors open.", "medium", "mitigating", "venue_workshop_hall", "session_03"),
    ("risk_03", "Wireless microphone kit shared", "Auditorium B sessions run back-to-back and depend on the same wireless kit.", "medium", "open", "venue_auditorium_b", "session_05"),
    ("risk_04", "Pavilion weather exposure", "Outdoor robotics demonstrations need a covered fallback area if rain begins.", "high", "monitoring", "venue_demo_pavilion", "session_09"),
    ("risk_05", "Afternoon registration queue", "Pitch showcase arrivals overlap with two seminar room sessions.", "low", "open", "venue_auditorium_b", "session_05"),
]


def at(hour: int, minute: int) -> datetime:
    return datetime.combine(EVENT_DATE, time(hour, minute))


def seed() -> dict[str, int]:
    initialize_database()
    with engine.begin() as connection:
        for table in reversed(Base.metadata.sorted_tables):
            connection.execute(table.delete())

    with SessionLocal() as db:
        event = Event(
            id=EVENT_ID,
            name="KBC TechFest 2026",
            description="A one-day university technology festival featuring research talks, hands-on workshops, startup pitches, and student demonstrations.",
            date=EVENT_DATE,
            start_time=at(9, 0),
            end_time=at(17, 0),
            status="planned",
        )
        db.add(event)

        venues = {
            row[0]: Venue(id=row[0], event_id=EVENT_ID, name=row[1], location=row[2], capacity=row[3], status=row[4])
            for row in VENUE_ROWS
        }
        speakers = {
            row[0]: Speaker(
                id=row[0], event_id=EVENT_ID, name=row[1], organization=row[2], email=row[3], title=row[4]
            )
            for row in SPEAKER_ROWS
        }
        volunteers = {
            f"volunteer_{index + 1:02d}": Volunteer(
                id=f"volunteer_{index + 1:02d}",
                event_id=EVENT_ID,
                name=row[0],
                email=f"volunteer{index + 1:02d}@example.org",
                role=row[1],
                availability="assigned" if index < 18 else "available",
            )
            for index, row in enumerate(VOLUNTEER_ROWS)
        }
        equipment = {
            row[0]: Equipment(
                id=row[0], event_id=EVENT_ID, name=row[1], category=row[2], quantity=row[3],
                venue_id=row[4], status=row[5]
            )
            for row in EQUIPMENT_ROWS
        }
        sessions: dict[str, Session] = {}
        for row in SESSION_ROWS:
            session_id, title, venue_id, start, end, speaker_ids, volunteer_indices, equipment_ids, description = row
            session = Session(
                id=session_id,
                event_id=EVENT_ID,
                venue_id=venue_id,
                title=title,
                description=description,
                start_time=at(*start),
                end_time=at(*end),
                status="scheduled",
                speakers=[speakers[speaker_id] for speaker_id in speaker_ids],
                volunteers=[volunteers[f"volunteer_{index + 1:02d}"] for index in volunteer_indices],
                equipment=[equipment[equipment_id] for equipment_id in equipment_ids],
            )
            sessions[session_id] = session

        db.add_all([*venues.values(), *speakers.values(), *volunteers.values(), *equipment.values(), *sessions.values()])

        for index, row in enumerate(TASK_ROWS, start=1):
            title, description, priority, volunteer_index, session_index = row
            session = sessions[f"session_{session_index:02d}"]
            db.add(
                Task(
                    id=f"task_{index:02d}",
                    event_id=EVENT_ID,
                    title=title,
                    description=description,
                    status="in_progress" if index in (1, 4, 9) else "open",
                    priority=priority,
                    due_time=at(8 + (index % 8), (index * 5) % 60),
                    assigned_volunteer=volunteers[f"volunteer_{volunteer_index + 1:02d}"],
                    session=session,
                    venue_id=session.venue_id,
                )
            )

        for risk_id, title, description, severity, status, venue_id, session_id in RISK_ROWS:
            db.add(
                Risk(
                    id=risk_id,
                    event_id=EVENT_ID,
                    title=title,
                    description=description,
                    severity=severity,
                    status=status,
                    venue_id=venue_id,
                    session_id=session_id,
                )
            )

        db.add(
            Change(
                id="change_01",
                event_id=EVENT_ID,
                entity_type="venue",
                entity_id="venue_auditorium_b",
                field_name="status",
                old_value="reserved",
                new_value="confirmed",
                reason="Venue walkthrough and technical check completed.",
                created_by="Operations team",
            )
        )
        db.commit()

        models = [Event, Venue, Session, Speaker, Volunteer, Equipment, Task, Risk, Change]
        return {
            model.__tablename__: db.scalar(select(func.count()).select_from(model)) or 0
            for model in models
        }


if __name__ == "__main__":
    for table_name, count in seed().items():
        print(f"{table_name}: {count}")
