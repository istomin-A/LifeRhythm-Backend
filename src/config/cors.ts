const corsOptions = {
  origin: ['http://localhost:5173', 'https://istomin-a.github.io'],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
};

export default corsOptions