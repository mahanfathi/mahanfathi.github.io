%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Medium Length Professional CV - RESUME CLASS FILE
%
% This template has been downloaded from:
% http://www.LaTeXTemplates.com
%
% This class file defines the structure and design of the template. 
%
% Original header:
% Copyright (C) 2010 by Trey Hunner
%
% Copying and distribution of this file, with or without modification,
% are permitted in any medium without royalty provided the copyright
% notice and this notice are preserved. This file is offered as-is,
% without any warranty.
%
% Created by Trey Hunner and modified by www.LaTeXTemplates.com
%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

\ProvidesClass{resume}[2010/07/10 v0.9 Resume class]

\LoadClass[10pt,letterpaper]{article} % Font size and paper type

\usepackage[parfill]{parskip} % Remove paragraph indentation
\usepackage{array} % Required for boldface (\bf and \bfseries) tabular columns
\usepackage{ifthen} % Required for ifthenelse statements
\usepackage{tikz}
\usepackage{cuted}
\usepackage{fontawesome}
\usepackage{graphicx}
\usepackage{scalerel}
\usepackage[inline]{enumitem}
\usepackage{bbding}


\RequirePackage{tikz}

\pagestyle{empty} % Suppress page numbers

%----------------------------------------------------------------------------------------
%	HEADINGS COMMANDS: Commands for printing name and address
%----------------------------------------------------------------------------------------

\def\changemargin#1#2{\list{}{\rightmargin#2\leftmargin#1}\item[]}
\let\endchangemargin=\endlist

\def \name#1{\def\@name{#1}} % Defines the \name command to set name
\def \@name {} % Sets \@name to empty by default

\def \addressSep {$\diamond$} % Set default address separator to a diamond

\def \columnWidth {1}

% One, two or three address lines can be specified 
\let \@addressone \relax
\let \@addresstwo \relax
\let \@addressthree \relax

% \address command can be used to set the first, second, and third address (last 2 optional)
\def \address #1{
  \@ifundefined{@addresstwo}{
    \def \@addresstwo {#1}
  }{
  \@ifundefined{@addressthree}{
  \def \@addressthree {#1}
  }{
     \def \@addressone {#1}
  }}
}

% \printaddress is used to style an address line (given as input)
\def \printaddress #1{
  \begingroup
    \def \\ {\addressSep\ }
    \centerline{#1}
  \endgroup
  \par
  \addressskip
}

% \printname is used to print the name as a page header
\def \printname {
  \begingroup
    \hfil{\MakeUppercase{\namesize\textbf{\@name}}}\hfil
    \nameskip\break
  \endgroup
}

%----------------------------------------------------------------------------------------
%	PRINT THE HEADING LINES
%----------------------------------------------------------------------------------------

\let\ori@document=\document
\renewcommand{\document}{
  \ori@document  % Begin document

%  \begin{strip}
      \printname % Print the name specified with \name
      \@ifundefined{@addressone}{}{ % Print the first address if specified
        \printaddress{\@addressone}}
      \@ifundefined{@addresstwo}{}{ % Print the second address if specified
        \printaddress{\@addresstwo}}
         \@ifundefined{@addressthree}{}{ % Print the third address if specified
        \printaddress{\@addressthree}}
        
        %\smallskip
%    \end{strip}
}

%----------------------------------------------------------------------------------------
%	SECTION FORMATTING
%----------------------------------------------------------------------------------------

% Defines the rSection environment for the large sections within the CV
\newenvironment{xSection}[1]{ % 1 input argument - section name
  \sectionskip
  \MakeUppercase{\textbf{#1}} % Section title
  \sectionlineskip
  \hrule % Horizontal line
  \begin{list}{}{ % List for each individual item in the section
    \setlength{\leftmargin}{0.2em} % Margin within the section
  }
  \item[]
}{
  \end{list}
}

% Defines the rSection environment for the large sections within the CV
\newenvironment{rSection}[1]{ % 1 input argument - section name
  %\sectionskip
  \MakeUppercase{\textbf{#1}} % Section title
  \sectionlineskip
  \hrule % Horizontal line
  \begin{list}{}{ % List for each individual item in the section
    \setlength{\leftmargin}{1.5em} % Margin within the section
  }
  \item[]
}{
  \end{list}
}

%----------------------------------------------------------------------------------------
%	WORK EXPERIENCE FORMATTING
%----------------------------------------------------------------------------------------

\newenvironment{xSubsection}[4]{ % 4 input arguments - company name, year(s) employed, job title and location
    \vspace{-.2em}
 \textbf{#1} \hfill {#2} % Bold company name and date on the right
 \ifthenelse{\equal{#3}{}}{}{ % If the third argument is not specified, don't print the job title and location line
  \\
  {\em #3} \hfill {\em #4} % Italic job title and location
  }
  \begin{list}{$\cdot$}{\leftmargin=0em} % \cdot used for bullets, no indentation
   \itemsep -0.5em \vspace{-0.5em} % Compress items in list together for aesthetics
  }{
  \end{list}
  \vspace{0.5em} % Some space after the list of bullet points
}


\newenvironment{rSubsection}[4]{ % 4 input arguments - company name, year(s) employed, job title and location
    \vspace{-.2em}
 \textbf{#1} \hfill {#2} % Bold company name and date on the right
 \ifthenelse{\equal{#3}{}}{}{ % If the third argument is not specified, don't print the job title and location line
  \\
  {\em #3} \hfill {\em #4} % Italic job title and location
  }\smallskip
  \begin{list}{$\cdot$}{\leftmargin=1em} % \cdot used for bullets, no indentation
   \itemsep -0.5em \vspace{-0.5em} % Compress items in list together for aesthetics
  }{
  \end{list}
  \vspace{0.1em} % Some space after the list of bullet points
}

\newenvironment{tSubsection}[4]{ % 4 input arguments - company name, year(s) employed, job title and location
    \vspace{-.3em}
 \textbf{#1} {{\tiny \OrnamentDiamondSolid} {\footnotesize\em #3}} \hfill {\em \footnotesize #4} {\tiny\DiamondSolid} {\footnotesize #2} % Bold company name and date on the right
 \smallskip
  \small
  \begin{list}{$\cdot$}{\leftmargin=1em} % \cdot used for bullets, no indentation
   \itemsep -0.0em \vspace{-0.2em} % Compress items in list together for aesthetics
  }{
  \end{list}
  \vspace{0.8em} % Some space after the list of bullet points
}

\newcommand{\pSubsection}[4]{ % 4 input arguments - venue, publication title, authors
    \vspace{-.3em}
 \cvtag{{\tiny \OrnamentDiamondSolid} \textbf{\footnotesize #1}} {\sc \textbf{#2}} \\
 {\footnotesize\em #3}
%  \smallskip
%   \small
%   \begin{list}{$\cdot$}{\leftmargin=1em} % \cdot used for bullets, no indentation
%    \itemsep -0.0em \vspace{-0.2em} % Compress items in list together for aesthetics
%   }{
%   \end{list}
%   \vspace{0.8em} % Some space after the list of bullet points
}

\newcommand{\aSubsection}[2]{ % 2 input arguments - award, year
    \vspace{-.2em}
 {\footnotesize #1} \hfill {\scriptsize #2} % Bold company name and date on the right
}

\newenvironment{kSubsection}[4]{ % 4 input arguments - company name, year(s) employed, job title and location
    \vspace{-.2em}
 \textbf{#1} \hfill {\scriptsize #2} % Bold company name and date on the right
 \ifthenelse{\equal{#3}{}}{}{ % If the third argument is not specified, don't print the job title and location line
  \\
  {\em #3} \hfill {\em \scriptsize #4} % Italic job title and location
  }\smallskip
  \begin{list}{$\cdot$}{\leftmargin=1em} % \cdot used for bullets, no indentation
   \itemsep -0.5em \vspace{-0.5em} % Compress items in list together for aesthetics
  }{
  \end{list}
  \vspace{0.1em} % Some space after the list of bullet points
}

\newenvironment{rSubsectionNoList}[4]{ % 4 input arguments - company name, year(s) employed, job title and location
 \textbf{#1} \hfill {#2} % Bold company name and date on the right
 \ifthenelse{\equal{#3}{}}{}{ % If the third argument is not specified, don't print the job title and location line
  \\
  {\em #3} \hfill {\em #4} % Italic job title and location
  }\smallskip
  \vspace{0.5em} % Some space after the list of bullet points
}

\newenvironment{dummy}[1]{#1}

%----------------------------------------------------------------------------------------
%	EXTENSIONS
%----------------------------------------------------------------------------------------

\colorlet{accent}{blue!70!black}
\colorlet{heading}{black}
\colorlet{emphasis}{black}
\colorlet{subheading}{black}
\colorlet{body}{black!80!white}

\newcommand{\cvtag}[1]{%
{\fontfamily{phv}\fontsize{8}{8}\selectfont
  \tikz[baseline]\node[anchor=base,draw=body!30,rounded corners,inner xsep=1ex,inner ysep =0.75ex,text height=1.5ex,text depth=.25ex]{\textbf{#1}};
}}

\newenvironment{myitemize}
    {\begin{itemize}[noitemsep,wide=0pt, leftmargin=\dimexpr\labelwidth + 2\labelsep\relax]}
    {\end{itemize}}

\def\offsetY{-2.5mm}

\newcommand{\ackskill}[3]{%
            \vspace{\offsetY}
			\hspace{0cm}\cvtag{#1}
			\medskip
			\def\temp{#2}\ifx\temp\empty
			\else
			  \\#2\smallskip %
			\fi
			{\fontfamily{cmr}\fontsize{9}{11}\selectfont
			\smallskip
			\begin{myitemize}
			\setlength\itemsep{0.1em}
				#3
			\end{myitemize}
			}
			\bigskip
}

\newcommand{\ackskilln}[3]{%
            \vspace{\offsetY}
			\hspace{-0.1cm}\cvtag{#1}
            \vspace{\offsetY}
			\medskip
			\def\temp{#2}\ifx\temp\empty
			\else
			  \\#2\smallskip %
			\fi
			{\fontfamily{cmr}\fontsize{9}{11}\selectfont
			\smallskip
			#3
			}
			\bigskip
}

\newcommand{\faprint}[1]{{\fontfamily{fontawesome}\fontsize{10}{12}\selectfont \symbol{#1}}}

\newcommand{\cvskillx}[2]{%
    \fontsize{10}{11}
\textcolor{emphasis}{\textbf{#1}}\hfill
	\foreach \x in {1,...,5}{%
	\ifnum \x>#2
	{\color{body!30}\faStar}
	\else%
	{\color{body}\faStar}
	\fi
	 % \space{\ifnumgreater{\x}{#2}{\color{body!30}}{\color{accent}}\faCircle}
	}\hspace{2cm}\par%
}
\newcommand{\cvskillr}[1]{%
    \fontsize{10}{11}
\textcolor{emphasis}{\textbf{#1}}\hfill
	 % \space{\ifnumgreater{\x}{#2}{\color{body!30}}{\color{accent}}\faCircle}
	\hspace{2cm}\par%
}

\newcommand{\cvskilln}[2]{%
    \fontsize{8}{11}
\textcolor{emphasis}{\textbf{#1}}\hfill
	\hspace{2cm}\par%
}

\newcommand{\cvskill}[2]{%
    \fontsize{8}{11}
\textcolor{emphasis}{\textbf{#1}}\hfill
	\foreach \x in {1,...,5}{%
	\ifnum \x>#2
	{\color{body!30}\faStar}
	\else%
	{\color{body}\faStar}
	\fi
	 % \space{\ifnumgreater{\x}{#2}{\color{body!30}}{\color{accent}}\faCircle}
	}\hspace{2cm}\par%
}

\newcommand{\ackcourse}[2]{
	\smallskip
	\cvtag{#1}
	\begin{itemize}
	\setlength\itemsep{-0.5em}
	#2
	\end{itemize}
}


% The below commands define the whitespace after certain things in the document - they can be \smallskip, \medskip or \bigskip
\def\namesize{\huge} % Size of the name at the top of the document
\def\addressskip{\smallskip} % The space between the two address (or phone/email) lines
\def\sectionlineskip{\medskip} % The space above the horizontal line for each section 
\def\nameskip{\smallskip} % The space after your name at the top
\def\sectionskip{\smallskip} % The space after the heading section

\RequirePackage[absolute,overlay]{textpos}
\setlength{\TPHorizModule}{1cm}
\setlength{\TPVertModule}{1cm}
\newenvironment{aside}{%
  \let\oldsection\section
  \renewcommand{\section}[1]{
    \par\vspace{\baselineskip}{\Large\headingfont\color{headercolor} ##1}
  }
  \begin{textblock}{3.6}(1.5, 4.33)
  \begin{flushright}
  \obeycr
}{%
  \restorecr
  \end{flushright}
  \end{textblock}
  \let\section\oldsection
}

\newcommand\sbullet[1][.5]{\mathbin{\ThisStyle{\vcenter{\hbox{%
  \scalebox{#1}{$\SavedStyle\bullet$}}}}}%
}

\renewcommand*{\thefootnote}{\fnsymbol{footnote}}

\newcommand\collab{\textsuperscript{**}}
