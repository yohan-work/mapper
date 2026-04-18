import MeetingRoom from "./MeetingRoom";

export default function MeetingPage({ params }: { params: { id: string } }) {
  return <MeetingRoom meetingId={params.id} />;
}
