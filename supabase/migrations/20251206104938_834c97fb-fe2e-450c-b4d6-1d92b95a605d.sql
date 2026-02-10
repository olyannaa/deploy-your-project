-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID REFERENCES public.profiles(id),
  organization TEXT,
  start_date DATE,
  end_date DATE,
  external_link TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_sections table
CREATE TABLE public.project_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  section_code TEXT NOT NULL,
  designation TEXT NOT NULL,
  section_name TEXT NOT NULL,
  start_date DATE,
  planned_end_date DATE,
  executor_id UUID REFERENCES public.profiles(id),
  completion_percent INTEGER NOT NULL DEFAULT 0,
  actual_end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Enable RLS on project_sections
ALTER TABLE public.project_sections ENABLE ROW LEVEL SECURITY;

-- Projects policies - authenticated users can view all projects
CREATE POLICY "Users can view all projects"
ON public.projects FOR SELECT
TO authenticated
USING (true);

-- Projects policies - admins and project managers can insert
CREATE POLICY "Admins and project managers can insert projects"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'project_manager') OR
  public.has_role(auth.uid(), 'department_head')
);

-- Projects policies - admins and project managers can update
CREATE POLICY "Admins and managers can update projects"
ON public.projects FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'project_manager') OR
  public.has_role(auth.uid(), 'department_head')
);

-- Projects policies - admins can delete
CREATE POLICY "Admins can delete projects"
ON public.projects FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Project sections policies - authenticated users can view
CREATE POLICY "Users can view project sections"
ON public.project_sections FOR SELECT
TO authenticated
USING (true);

-- Project sections policies - admins and project managers can insert
CREATE POLICY "Admins and managers can insert sections"
ON public.project_sections FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'project_manager') OR
  public.has_role(auth.uid(), 'department_head')
);

-- Project sections policies - admins and project managers can update
CREATE POLICY "Admins and managers can update sections"
ON public.project_sections FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'project_manager') OR
  public.has_role(auth.uid(), 'department_head')
);

-- Project sections policies - admins and project managers can delete
CREATE POLICY "Admins and managers can delete sections"
ON public.project_sections FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'project_manager') OR
  public.has_role(auth.uid(), 'department_head')
);

-- Triggers for updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_project_sections_updated_at
BEFORE UPDATE ON public.project_sections
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();