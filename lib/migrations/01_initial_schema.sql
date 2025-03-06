-- Initial schema migration
-- Created on 2025-03-06T04:39:07.971Z

-- Full SQL migration
-- Copy this SQL and run it in the Supabase SQL Editor

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  full_name text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles (with checks to prevent duplicates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can read all profiles'
  ) THEN
    CREATE POLICY "Users can read all profiles"
      ON profiles
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile"
      ON profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END
$$;

-- Create rides table
CREATE TABLE IF NOT EXISTS rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES auth.users NOT NULL,
  pickup_location text NOT NULL,
  dropoff_location text NOT NULL,
  departure_time timestamptz NOT NULL,
  available_seats int NOT NULL CHECK (available_seats >= 0),
  price decimal NOT NULL CHECK (price >= 0),
  status text NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on rides
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;

-- Create policies for rides (with checks to prevent duplicates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'rides' AND policyname = 'Anyone can read active rides'
  ) THEN
    CREATE POLICY "Anyone can read active rides"
      ON rides
      FOR SELECT
      TO authenticated
      USING (status = 'active' OR driver_id = auth.uid());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'rides' AND policyname = 'Users can create rides'
  ) THEN
    CREATE POLICY "Users can create rides"
      ON rides
      FOR INSERT
      TO authenticated
      WITH CHECK (driver_id = auth.uid());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'rides' AND policyname = 'Drivers can update their own rides'
  ) THEN
    CREATE POLICY "Drivers can update their own rides"
      ON rides
      FOR UPDATE
      TO authenticated
      USING (driver_id = auth.uid());
  END IF;
END
$$;

-- Create ride_requests table
CREATE TABLE IF NOT EXISTS ride_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES rides NOT NULL,
  passenger_id uuid REFERENCES auth.users NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
  seats_requested int NOT NULL CHECK (seats_requested > 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(ride_id, passenger_id)
);

-- Enable RLS on ride_requests
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for ride_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'ride_requests' AND policyname = 'Users can see their own requests and requests for their rides'
  ) THEN
    CREATE POLICY "Users can see their own requests and requests for their rides"
      ON ride_requests
      FOR SELECT
      TO authenticated
      USING (
        passenger_id = auth.uid() OR 
        ride_id IN (SELECT id FROM rides WHERE driver_id = auth.uid())
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'ride_requests' AND policyname = 'Users can create their own requests'
  ) THEN
    CREATE POLICY "Users can create their own requests"
      ON ride_requests
      FOR INSERT
      TO authenticated
      WITH CHECK (passenger_id = auth.uid());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'ride_requests' AND policyname = 'Users can update their own requests'
  ) THEN
    CREATE POLICY "Users can update their own requests"
      ON ride_requests
      FOR UPDATE
      TO authenticated
      USING (
        passenger_id = auth.uid() OR
        ride_id IN (SELECT id FROM rides WHERE driver_id = auth.uid())
      );
  END IF;
END
$$;

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES rides NOT NULL,
  sender_id uuid REFERENCES auth.users NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies for messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can see messages for rides they are part of'
  ) THEN
    CREATE POLICY "Users can see messages for rides they are part of"
      ON messages
      FOR SELECT
      TO authenticated
      USING (
        sender_id = auth.uid() OR
        ride_id IN (SELECT id FROM rides WHERE driver_id = auth.uid()) OR
        ride_id IN (SELECT ride_id FROM ride_requests WHERE passenger_id = auth.uid() AND status = 'approved')
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can send messages for rides they are part of'
  ) THEN
    CREATE POLICY "Users can send messages for rides they are part of"
      ON messages
      FOR INSERT
      TO authenticated
      WITH CHECK (
        sender_id = auth.uid() AND (
          ride_id IN (SELECT id FROM rides WHERE driver_id = auth.uid()) OR
          ride_id IN (SELECT ride_id FROM ride_requests WHERE passenger_id = auth.uid() AND status = 'approved')
        )
      );
  END IF;
END
$$;

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES rides NOT NULL,
  reviewer_id uuid REFERENCES auth.users NOT NULL,
  reviewee_id uuid REFERENCES auth.users NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(ride_id, reviewer_id, reviewee_id)
);

-- Enable RLS on reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Create policies for reviews
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Anyone can read reviews'
  ) THEN
    CREATE POLICY "Anyone can read reviews"
      ON reviews
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Users can create reviews for their rides'
  ) THEN
    CREATE POLICY "Users can create reviews for their rides"
      ON reviews
      FOR INSERT
      TO authenticated
      WITH CHECK (
        reviewer_id = auth.uid() AND (
          ride_id IN (SELECT id FROM rides WHERE driver_id = auth.uid()) OR
          ride_id IN (SELECT ride_id FROM ride_requests WHERE passenger_id = auth.uid() AND status = 'approved')
        )
      );
  END IF;
END
$$;