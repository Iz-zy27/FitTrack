export type Exercise = {
  id: string;
  user_id: string;
  name: string;
  muscle_group: string | null;
};

export type Workout = {
  id: string;
  user_id: string;
  title: string;
  workout_date: string;
  notes: string | null;
};

export type WorkoutSet = {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_number: number;
  weight: number;
  reps: number;
  created_at: string;
};

export type PersonalRecord = {
  user_id: string;
  exercise_id: string;
  exercise_name: string;
  muscle_group: string | null;
  best_weight: number;
  reps_at_best: number;
  est_one_rm: number;
  achieved_on: string;
};

export type FriendShare = {
  id: string;
  owner_id: string;
  friend_email: string;
  can_view_workouts: boolean;
  can_view_records: boolean;
  status: "pending" | "accepted" | "revoked";
};
