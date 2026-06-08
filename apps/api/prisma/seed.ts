import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  await prisma.chatMessageAttachment.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatParticipant.deleteMany();
  await prisma.chatRoom.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.scheduleLesson.deleteMany();
  await prisma.groupSubject.deleteMany();
  await prisma.groupStudent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.teacherProfile.deleteMany();
  await prisma.group.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@top.ru',
      passwordHash,
      role: 'admin',
      status: 'active',
      teacherProfile: {
        create: { firstName: 'Админ', lastName: 'Системный' },
      },
    },
  });

  const teacher = await prisma.user.create({
    data: {
      email: 'teacher@top.ru',
      username: 'ivanov_teach',
      passwordHash,
      role: 'teacher',
      status: 'active',
      teacherProfile: {
        create: { firstName: 'Иван', lastName: 'Иванов', middleName: 'Иванович' },
      },
    },
  });

  const teacher2 = await prisma.user.create({
    data: {
      email: 'sidorova@top.ru',
      passwordHash,
      role: 'teacher',
      status: 'active',
      teacherProfile: {
        create: { firstName: 'Мария', lastName: 'Сидорова', middleName: 'Петровна' },
      },
    },
  });

  const student = await prisma.user.create({
    data: {
      email: 'student@top.ru',
      username: 'mafffiz',
      passwordHash,
      role: 'student',
      status: 'active',
      studentProfile: {
        create: { firstName: 'Алексей', lastName: 'Петров', phone: '+7 999 123-45-67' },
      },
    },
  });

  const student2 = await prisma.user.create({
    data: {
      email: 'student2@top.ru',
      username: 'kozlov_d',
      passwordHash,
      role: 'student',
      status: 'active',
      studentProfile: {
        create: { firstName: 'Дмитрий', lastName: 'Козлов' },
      },
    },
  });

  const group = await prisma.group.create({
    data: {
      name: 'ИС-24/1',
      code: 'IS-24-1',
      academicYear: '2025/2026',
      status: 'active',
      chatRoom: { create: { type: 'group', name: 'ИС-24/1 — общий чат' } },
    },
    include: { chatRoom: true },
  });

  const python = await prisma.subject.create({
    data: { name: 'Программирование на Python', shortName: 'Python', colorHex: '#8B5CF6' },
  });
  const db = await prisma.subject.create({
    data: { name: 'Базы данных', shortName: 'БД', colorHex: '#3B82F6' },
  });
  const web = await prisma.subject.create({
    data: { name: 'Веб-разработка', shortName: 'Web', colorHex: '#06B6D4' },
  });

  await prisma.groupSubject.createMany({
    data: [
      { groupId: group.id, subjectId: python.id, teacherId: teacher.id, hoursPerWeek: 4 },
      { groupId: group.id, subjectId: db.id, teacherId: teacher2.id, hoursPerWeek: 3 },
      { groupId: group.id, subjectId: web.id, teacherId: teacher.id, hoursPerWeek: 4 },
    ],
  });

  const room204 = await prisma.room.create({ data: { name: '204', building: 'Корпус А', capacity: 30 } });
  const room301 = await prisma.room.create({ data: { name: '301', building: 'Корпус А', capacity: 25 } });

  await prisma.groupStudent.createMany({
    data: [
      { groupId: group.id, studentId: student.id, isActive: true },
      { groupId: group.id, studentId: student2.id, isActive: true },
    ],
  });

  const chatRoomId = group.chatRoom!.id;
  const participants = [student.id, student2.id, teacher.id, teacher2.id, admin.id];
  await prisma.chatParticipant.createMany({
    data: participants.map((userId) => ({
      roomId: chatRoomId,
      userId,
      role: userId === teacher.id || userId === admin.id ? 'moderator' : 'member',
    })),
  });

  await prisma.chatMessage.createMany({
    data: [
      {
        roomId: chatRoomId,
        senderId: teacher.id,
        content: 'Добрый день! Не забудьте сдать ДЗ по Python до пятницы.',
      },
      {
        roomId: chatRoomId,
        senderId: student.id,
        content: 'Спасибо, понял!',
      },
    ],
  });

  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const lessons = [
    { day: 0, hour: 10, subject: python, teacher: teacher.id, room: room204.id, type: 'practice' as const, duration: 1.5 },
    { day: 1, hour: 12, subject: db, teacher: teacher2.id, room: room301.id, type: 'lecture' as const, duration: 1.5 },
    { day: 2, hour: 10, subject: web, teacher: teacher.id, room: room204.id, type: 'lab' as const, duration: 2 },
    { day: 3, hour: 14, subject: python, teacher: teacher.id, room: room204.id, type: 'practice' as const, duration: 1.5 },
    { day: 4, hour: 10, subject: db, teacher: teacher2.id, room: room301.id, type: 'practice' as const, duration: 1.5 },
  ];

  const createdLessons = [];
  for (const l of lessons) {
    const startsAt = new Date(monday);
    startsAt.setDate(monday.getDate() + l.day);
    startsAt.setHours(l.hour, 0, 0, 0);
    const endsAt = new Date(startsAt.getTime() + l.duration * 3600000);

    const lesson = await prisma.scheduleLesson.create({
      data: {
        groupId: group.id,
        subjectId: l.subject.id,
        teacherId: l.teacher,
        roomId: l.room,
        lessonType: l.type,
        startsAt,
        endsAt,
      },
    });
    createdLessons.push(lesson);
  }

  const todayLesson = createdLessons.find((l) => {
    const d = new Date(l.startsAt);
    return d.toDateString() === now.toDateString();
  }) ?? createdLessons[0];

  await prisma.grade.createMany({
    data: [
      { studentId: student.id, lessonId: todayLesson.id, groupId: group.id, subjectId: python.id, teacherId: teacher.id, value: 5, gradeType: 'classwork', topic: 'Функции и модули' },
      { studentId: student.id, groupId: group.id, subjectId: db.id, teacherId: teacher2.id, value: 4, gradeType: 'homework', topic: 'SQL-запросы' },
      { studentId: student.id, groupId: group.id, subjectId: web.id, teacherId: teacher.id, value: 5, gradeType: 'test', topic: 'HTML/CSS' },
      { studentId: student2.id, lessonId: todayLesson.id, groupId: group.id, subjectId: python.id, teacherId: teacher.id, value: 4, gradeType: 'classwork', topic: 'Функции и модули' },
    ],
  });

  await prisma.attendanceRecord.createMany({
    data: [
      { studentId: student.id, lessonId: createdLessons[0].id, status: 'present', markedBy: teacher.id },
      { studentId: student2.id, lessonId: createdLessons[0].id, status: 'late', markedBy: teacher.id },
      { studentId: student.id, lessonId: createdLessons[1].id, status: 'present', markedBy: teacher2.id },
      { studentId: student.id, lessonId: createdLessons[2].id, status: 'excused', markedBy: teacher.id },
    ],
  });

  await prisma.friendship.create({
    data: { senderId: student.id, receiverId: student2.id, status: 'accepted' },
  });

  const dmKey = [student.id, student2.id].sort().join(':');
  const dmRoom = await prisma.chatRoom.create({
    data: {
      type: 'private',
      dmKey,
      participants: {
        create: [{ userId: student.id }, { userId: student2.id }],
      },
    },
  });

  await prisma.chatMessage.create({
    data: {
      roomId: dmRoom.id,
      senderId: student2.id,
      content: 'Привет! Добавил тебя в друзья 👋',
    },
  });

  console.log('Seed completed!');
  console.log('');
  console.log('Demo accounts (password: password123):');
  console.log('  student@top.ru  (@mafffiz)    — ученик');
  console.log('  student2@top.ru (@kozlov_d)   — ученик');
  console.log('  teacher@top.ru  (@ivanov_teach)— преподаватель');
  console.log('  admin@top.ru                  — администратор');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
